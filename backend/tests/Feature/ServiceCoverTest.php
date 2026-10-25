<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

class ServiceCoverTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    private const TANJAY = '0704622000';

    private const DUMAGUETE = '0704610000';

    public function test_cover_is_re_encoded_without_photo_metadata_and_waits_for_review(): void
    {
        Storage::fake('public');
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $profileId = $this->approvedProvider($providerUser);

        $this->uploadCover($providerUser, $this->serviceId($profileId), $this->photoWithLocation(2400, 1600))
            ->assertOk()
            ->assertJsonPath('services.0.cover.status', 'pending')
            ->assertJsonPath('services.0.cover.focusX', 40);

        $files = Storage::disk('public')->files("providers/{$profileId}/services");
        $this->assertCount(1, $files);
        $stored = Storage::disk('public')->get($files[0]);
        $size = getimagesizefromstring($stored);
        $this->assertSame('image/webp', $size['mime']);
        $this->assertSame([1600, 1067], [$size[0], $size[1]]);
        $this->assertStringNotContainsString('GPSLatitude', $stored);
        $this->getJson('/api/featured-services?cityCode='.self::TANJAY)->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_cover_upload_rejects_images_too_small_for_the_home_page(): void
    {
        Storage::fake('public');
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $profileId = $this->approvedProvider($providerUser);

        $this->uploadCover($providerUser, $this->serviceId($profileId), UploadedFile::fake()->image('poster.png', 800, 500))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cover' => 'Use an image at least 1000 × 600 pixels so it stays sharp on the Home page.']);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_providers_cannot_change_covers_on_services_they_do_not_own(): void
    {
        Storage::fake('public');
        $this->seedMarketplaceReferenceData();
        $ownerProfileId = $this->approvedProvider(User::factory()->create());
        $otherProviderUser = User::factory()->create();
        $this->approvedProvider($otherProviderUser, 'Other Electrical');

        $this->uploadCover($otherProviderUser, $this->serviceId($ownerProfileId), UploadedFile::fake()->image('cover.jpg', 1600, 1200))->assertNotFound();
        $this->actingAs($otherProviderUser)->deleteJson("/api/provider/services/{$this->serviceId($ownerProfileId)}/cover")->assertNotFound();
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_approved_cover_is_featured_once_per_provider_and_only_where_they_work(): void
    {
        Storage::fake('public');
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $profileId = $this->approvedProvider($providerUser);
        $electricalId = $this->serviceId($profileId);
        $this->actingAs($providerUser)->postJson('/api/provider/services', ['category' => 'Solar', 'description' => 'Rooftop panels'])->assertOk();
        $solarId = (int) DB::table('provider_services')->where('provider_profile_id', $profileId)->where('id', '!=', $electricalId)->value('id');
        $admin = $this->admin();

        foreach ([$electricalId, $solarId] as $serviceId) {
            $this->uploadCover($providerUser, $serviceId, UploadedFile::fake()->image('cover.jpg', 1600, 1200))->assertOk();
            $this->actingAs($admin)->postJson("/api/admin/listings/service/{$serviceId}/cover-review", ['decision' => 'approved'])->assertOk();
        }

        $this->getJson('/api/featured-services?cityCode='.self::TANJAY)->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.providerId', (string) $profileId)
            ->assertJsonPath('data.0.category', 'Solar')
            ->assertJsonPath('data.0.areaLabel', 'Tanjay City')
            ->assertJsonPath('data.0.cover.focusY', 30);
        $this->getJson('/api/featured-services?cityCode='.self::DUMAGUETE)->assertOk()->assertJsonCount(0, 'data');
        $this->assertDatabaseHas('provider_notifications', ['provider_profile_id' => $profileId, 'title' => 'Cover approved']);
        $this->assertDatabaseHas('security_audits', ['user_id' => $admin->id, 'event_type' => 'SERVICE_COVER_APPROVED']);
    }

    public function test_rejecting_a_cover_requires_a_reason_and_tells_the_provider_why(): void
    {
        Storage::fake('public');
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $profileId = $this->approvedProvider($providerUser);
        $serviceId = $this->serviceId($profileId);
        $this->uploadCover($providerUser, $serviceId, UploadedFile::fake()->image('poster.jpg', 1080, 1350))->assertOk();
        $admin = $this->admin();

        $this->actingAs($admin)->postJson("/api/admin/listings/service/{$serviceId}/cover-review", ['decision' => 'rejected'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['reason' => 'Tell the provider why the cover was not approved.']);
        $this->actingAs($admin)->postJson("/api/admin/listings/service/{$serviceId}/cover-review", ['decision' => 'rejected', 'reason' => 'Remove the phone number from the poster.'])
            ->assertOk();

        $this->actingAs($providerUser)->getJson('/api/provider/workspace')->assertOk()
            ->assertJsonPath('services.0.cover.status', 'rejected')
            ->assertJsonPath('services.0.cover.note', 'Remove the phone number from the poster.');
        $this->assertDatabaseHas('provider_notifications', ['provider_profile_id' => $profileId,
            'detail' => 'Your Electrical cover was not approved: Remove the phone number from the poster.']);
        $this->getJson('/api/featured-services?cityCode='.self::TANJAY)->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_support_staff_cannot_review_covers(): void
    {
        Storage::fake('public');
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $serviceId = $this->serviceId($this->approvedProvider($providerUser));
        $this->uploadCover($providerUser, $serviceId, UploadedFile::fake()->image('cover.jpg', 1600, 1200))->assertOk();

        $this->actingAs($this->admin('support'))->postJson("/api/admin/listings/service/{$serviceId}/cover-review", ['decision' => 'approved'])->assertForbidden();
        $this->assertDatabaseHas('provider_services', ['id' => $serviceId, 'cover_status' => 'pending']);
    }

    public function test_new_image_or_new_category_sends_an_approved_cover_back_to_review(): void
    {
        Storage::fake('public');
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $profileId = $this->approvedProvider($providerUser);
        $serviceId = $this->serviceId($profileId);
        $admin = $this->admin();
        $this->uploadCover($providerUser, $serviceId, UploadedFile::fake()->image('first.jpg', 1600, 1200))->assertOk();
        $firstPath = DB::table('provider_services')->where('id', $serviceId)->value('cover_path');
        $this->actingAs($admin)->postJson("/api/admin/listings/service/{$serviceId}/cover-review", ['decision' => 'approved'])->assertOk();

        $this->uploadCover($providerUser, $serviceId, UploadedFile::fake()->image('second.jpg', 1600, 1200))
            ->assertOk()->assertJsonPath('services.0.cover.status', 'pending');
        Storage::disk('public')->assertMissing($firstPath);

        $this->actingAs($admin)->postJson("/api/admin/listings/service/{$serviceId}/cover-review", ['decision' => 'approved'])->assertOk();
        $this->actingAs($providerUser)->putJson("/api/provider/services/{$serviceId}", ['category' => 'Solar', 'description' => 'Rooftop panels'])
            ->assertOk()->assertJsonPath('services.0.cover.status', 'pending');
    }

    public function test_hidden_services_leave_customer_search_and_the_home_row(): void
    {
        Storage::fake('public');
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $profileId = $this->approvedProvider($providerUser);
        $serviceId = $this->serviceId($profileId);
        $admin = $this->admin();
        $this->uploadCover($providerUser, $serviceId, UploadedFile::fake()->image('cover.jpg', 1600, 1200))->assertOk();
        $this->actingAs($admin)->postJson("/api/admin/listings/service/{$serviceId}/cover-review", ['decision' => 'approved'])->assertOk();

        $this->actingAs($admin)->patchJson("/api/admin/listings/service/{$serviceId}/visibility", ['is_visible' => false, 'reason' => 'Misleading claims.'])->assertOk();

        $this->getJson('/api/providers?category=electrical&cityCode='.self::TANJAY)->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/featured-services?cityCode='.self::TANJAY)->assertOk()->assertJsonCount(0, 'data');
    }

    private function uploadCover(User $providerUser, int $serviceId, UploadedFile $cover): TestResponse
    {
        return $this->actingAs($providerUser)->post("/api/provider/services/{$serviceId}/cover",
            ['cover' => $cover, 'fit' => 'cover', 'focusX' => 40, 'focusY' => 30], ['Accept' => 'application/json']);
    }

    private function serviceId(int $profileId): int
    {
        return (int) DB::table('provider_services')->where('provider_profile_id', $profileId)->orderBy('id')->value('id');
    }

    /** A JPEG carrying an EXIF block with GPS text, like a photo taken on a phone at a customer's house. */
    private function photoWithLocation(int $width, int $height): UploadedFile
    {
        $image = imagecreatetruecolor($width, $height);
        ob_start();
        imagejpeg($image);
        $jpeg = (string) ob_get_clean();
        $exif = "Exif\0\0GPSLatitude 9.5153 GPSLongitude 123.1547";
        $withExif = substr($jpeg, 0, 2)."\xFF\xE1".pack('n', strlen($exif) + 2).$exif.substr($jpeg, 2);

        return UploadedFile::fake()->createWithContent('site-photo.jpg', $withExif);
    }
}
