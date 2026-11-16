<?php

namespace Database\Seeders;

use App\Models\ServiceLocation;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Sample marketplace data for demos, screenshots and the marketing videos, in City of Tanjay.
 *
 * LOCAL ONLY. Refuses to run in production. Every account it makes ends in DEMO_DOMAIN, and a re-run
 * deletes only those accounts first, so it never touches real data.
 *
 *   docker exec ayos-backend-1 php artisan db:seed --class=DemoMarketplaceSeeder
 *
 * Demo logins (all share PASSWORD): lea.demo@ayos.test (customer), jun.demo@ayos.test (provider).
 * Photos: copy them first (see the AYOS marketing README), else the accounts are made without photos.
 */
class DemoMarketplaceSeeder extends Seeder
{
    public const DEMO_DOMAIN = '.demo@ayos.test';

    public const PASSWORD = 'AyosDemo#2026-Tanjay';

    private const REGION = '1800000000';

    private const PROVINCE = '1804600000';

    private const CITY = '1804621000';

    private int $providerCount = 0;

    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('DemoMarketplaceSeeder is for local demos only.');
        }

        DB::transaction(function (): void {
            User::query()->where('email', 'like', '%'.self::DEMO_DOMAIN)->get()->each->delete();

            $lea = $this->customer('lea', 'Lea Santos', '09170000001', '1804621016', 'Purok 3, Sample St.', 'Near the plaza');
            $grace = $this->customer('grace', 'Grace Tan', '09170000002', '1804621008', 'Sample Rd.', null);
            $carlo = $this->customer('carlo', 'Carlo Villanueva', '09170000003', '1804621019', 'Sample Ave.', null);
            $paolo = $this->customer('paolo', 'Paolo Abellana', '09170000004', '1804621001', 'Sample Lane', null);

            $jun = $this->provider('jun', 'Jun Reyes Plumbing', 'Leaks, clogged drains, faucets and new pipes for homes in Tanjay.', 7, ['plumbing' => 'Leak repair, drains and faucets', 'carpentry' => 'Cabinet and sink repairs'], 'demo/jun-reyes.jpg');
            $aircon = $this->provider('aircon', 'Tanjay Cool Aircon', 'Aircon cleaning, freon and repair for window and split types.', 5, ['aircon' => 'Cleaning, freon and repair', 'appliance-repair' => 'Ref and washing machine repair'], null);
            $marco = $this->provider('marco', 'Marco Electrical Works', 'House wiring, outlets, breakers and solar setups.', 9, ['electrical' => 'Wiring, outlets and breakers', 'solar' => 'Small home solar setups'], null);
            $this->provider('bea', 'Bea Gadget Repair', 'Phone screens, batteries and laptop repairs.', 4, ['phone-repair' => 'Screens and batteries', 'computer-repair' => 'Laptops and desktops'], null);

            // Finished, reviewed jobs: the reviews and completed count on Jun's profile.
            foreach ([[$carlo, 5, 'Paspas kaayo moabot ug limpyo ang trabaho. Salamat Kuya Jun!', 12],
                [$paolo, 5, 'Na-fix ang leak sa CR namo. Recommended!', 20],
                [$grace, 4, 'Maayo ang trabaho, gamay ra na-late.', 33]] as [$customer, $rating, $comment, $daysAgo]) {
                $jobId = $this->job($customer, $jun, 'Tulo sa tubo sa lababo.', 'completed', now()->subDays($daysAgo));
                DB::table('provider_reviews')->insert(['provider_job_id' => $jobId, 'provider_profile_id' => $jun, 'customer_id' => $customer->id,
                    'rating' => $rating, 'comment' => $comment, 'created_at' => now()->subDays($daysAgo - 1), 'updated_at' => now()->subDays($daysAgo - 1)]);
            }

            // Lea's earlier carpentry job with Jun, reviewed: Jun shows under "Book again" on her Home with her rating.
            $leaJob = $this->job($lea, $jun, 'Guba ang pultahan sa kabinet sa kusina.', 'completed', now()->subDays(45), null, false, 'carpentry');
            DB::table('provider_reviews')->insert(['provider_job_id' => $leaJob, 'provider_profile_id' => $jun, 'customer_id' => $lea->id,
                'rating' => 5, 'comment' => 'Limpyo ug paspas ang trabaho. Mobalik ko ni Kuya Jun.', 'created_at' => now()->subDays(44), 'updated_at' => now()->subDays(44)]);

            // Lea's leak: accepted and scheduled for tomorrow morning (the customer tracker and the provider schedule).
            $this->job($lea, $jun, 'Nag-leak ang tubo sa ilawom sa lababo. Basa na ang salog.', 'scheduled', now()->subHours(3), now('Asia/Manila')->addDay()->setTime(9, 0)->utc(), true);

            // A new request still waiting for Jun (the provider's Requests inbox).
            $this->request($grace, $jun, 'Guba ang gripo sa kusina, padayon ang tulo.', 'new', now()->subMinutes(40), true);

            // Lea's to-dos on Home ("Needs you"): aircon work marked finished and waiting for her confirmation,
            // a finished electrical job she has not reviewed yet, and an unread reply from Jun.
            $this->job($lea, $aircon, 'Dili na mobugnaw ang aircon sa kwarto, kinahanglan limpyo ug freon.', 'provider_finished', now()->subDays(2), now()->subHours(5), false, 'aircon');
            $this->job($lea, $marco, 'Nag-spark ang outlet sa sala, ilisan ug bag-o.', 'completed', now()->subDays(6), null, false, 'electrical');
            $this->conversation($lea, $jun, [
                ['customer', 'Kuya Jun, ugma pa ba ka moabot? Basa na kaayo ang salog.', now()->subHours(2)],
                ['provider', 'Oo Ma\'am Lea, alas 9 sa buntag. Dad-on nako ang pyesa sa tubo.', now()->subMinutes(25)],
            ]);
        });
    }

    private function customer(string $key, string $name, string $mobile, string $barangay, string $line, ?string $landmark): User
    {
        $user = User::query()->create(['name' => $name, 'email' => $key.self::DEMO_DOMAIN, 'mobile_number' => $mobile, 'password' => Hash::make(self::PASSWORD)]);
        $user->forceFill(['email_verified_at' => now(), 'terms_accepted_at' => now()])->save();
        DB::table('user_profiles')->insert(['user_id' => $user->id, 'display_name' => $name, 'created_at' => now(), 'updated_at' => now()]);
        $user->serviceLocations()->save(new ServiceLocation(['label' => 'Home', 'region_code' => self::REGION, 'province_code' => self::PROVINCE,
            'city_municipality_code' => self::CITY, 'barangay_code' => $barangay, 'address_line' => $line, 'landmark' => $landmark, 'is_default' => true]));

        return $user;
    }

    /** @param array<string, string> $services category slug => description */
    private function provider(string $key, string $displayName, string $bio, int $years, array $services, ?string $photo): int
    {
        $user = $this->customer($key, $displayName, '0918000'.str_pad((string) ++$this->providerCount, 4, '0', STR_PAD_LEFT), '1804621008', 'Sample shop address', null);
        $profileId = DB::table('provider_profiles')->insertGetId([
            'user_id' => $user->id, 'status' => 'approved', 'display_name' => $displayName, 'bio' => $bio, 'years_experience' => $years,
            'photo_path' => $photo && Storage::disk('public')->exists($photo) ? $photo : null,
            'verified' => true, 'accepting_requests' => true, 'access_kind' => 'trial', 'approved_at' => now()->subMonth(),
            'created_at' => now()->subMonth(), 'updated_at' => now(),
        ]);
        foreach ($services as $slug => $description) {
            DB::table('provider_services')->insert(['provider_profile_id' => $profileId, 'service_category_id' => DB::table('service_categories')->where('slug', $slug)->value('id'),
                'description' => $description, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        }
        DB::table('provider_service_areas')->insert(['provider_profile_id' => $profileId, 'region_code' => self::REGION, 'province_code' => self::PROVINCE,
            'city_municipality_code' => self::CITY, 'barangay_code' => null, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);

        return $profileId;
    }

    private function request(User $customer, int $providerId, string $description, string $status, \DateTimeInterface $at, bool $withPhoto = false, string $category = 'plumbing'): int
    {
        $requestId = DB::table('service_requests')->insertGetId([
            'customer_id' => $customer->id, 'provider_profile_id' => $providerId,
            'service_category_id' => DB::table('service_categories')->where('slug', $category)->value('id'),
            'service_location_id' => $customer->serviceLocations()->value('id'), 'description' => $description, 'notes' => '',
            'preferred_at' => now('Asia/Manila')->addDay()->setTime(9, 0)->utc(), 'status' => $status, 'created_at' => $at, 'updated_at' => $at,
        ]);
        if ($withPhoto && Storage::disk('local')->exists('demo/leak.jpg')) {
            $path = 'service-requests/'.$requestId.'/leak.jpg';
            Storage::disk('local')->copy('demo/leak.jpg', $path);
            DB::table('service_request_photos')->insert(['service_request_id' => $requestId, 'image_path' => $path, 'created_at' => $at, 'updated_at' => $at]);
        }

        return $requestId;
    }

    private function job(User $customer, int $providerId, string $description, string $status, \DateTimeInterface $at, ?\DateTimeInterface $scheduledAt = null, bool $withPhoto = false, string $category = 'plumbing'): int
    {
        $requestId = $this->request($customer, $providerId, $description, 'accepted', $at, $withPhoto, $category);

        return DB::table('provider_jobs')->insertGetId([
            'service_request_id' => $requestId, 'provider_profile_id' => $providerId, 'customer_id' => $customer->id, 'status' => $status,
            'scheduled_at' => $scheduledAt ?? $at, 'completed_at' => $status === 'completed' ? $at : null, 'created_at' => $at, 'updated_at' => $at,
        ]);
    }

    /**
     * A chat between a customer and a provider. The customer has read up to their own last message,
     * so any provider message after it shows as unread for them.
     *
     * @param  list<array{0: 'customer'|'provider', 1: string, 2: \DateTimeInterface}>  $messages
     */
    private function conversation(User $customer, int $providerId, array $messages): void
    {
        $providerUserId = (int) DB::table('provider_profiles')->where('id', $providerId)->value('user_id');
        $conversationId = DB::table('conversations')->insertGetId(['customer_id' => $customer->id, 'provider_profile_id' => $providerId,
            'created_at' => $messages[0][2], 'updated_at' => now()]);
        $read = ['customer' => 0, 'provider' => 0];
        foreach ($messages as [$role, $body, $at]) {
            $id = DB::table('conversation_messages')->insertGetId(['conversation_id' => $conversationId, 'sender_role' => $role,
                'sender_id' => $role === 'customer' ? $customer->id : $providerUserId, 'body' => $body, 'created_at' => $at, 'updated_at' => $at]);
            $read[$role] = $id;
        }
        DB::table('conversations')->where('id', $conversationId)->update(['last_message_at' => end($messages)[2],
            'customer_last_read_id' => $read['customer'], 'provider_last_read_id' => max($read)]);
    }
}
