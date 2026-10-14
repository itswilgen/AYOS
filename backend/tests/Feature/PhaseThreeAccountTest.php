<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhaseThreeAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_state_endpoint_is_available(): void
    {
        $this->getJson('/api/platform-state')->assertOk()->assertJsonStructure(['maintenance_mode']);
    }
}
