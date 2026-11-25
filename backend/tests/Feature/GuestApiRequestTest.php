<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A signed-out visit to a private API address (for example a document link opened in a new tab) must get a
 * clean 401, never a crash. It used to try to redirect to a "login" page the API doesn't have (a 500).
 */
class GuestApiRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_signed_out_browser_visit_to_a_private_document_gets_a_clean_401(): void
    {
        // Like a new browser tab: it asks for a page (HTML), not JSON.
        $this->get('/api/admin/provider-applications/1/documents/1', ['Accept' => 'text/html'])
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Unauthenticated.']);
    }

    public function test_the_same_holds_for_dispute_evidence_and_the_providers_own_documents(): void
    {
        $this->get('/api/admin/disputes/1/evidence/1', ['Accept' => 'text/html'])->assertUnauthorized();
        $this->get('/api/provider/verification-documents/1', ['Accept' => 'text/html'])->assertUnauthorized();
    }
}
