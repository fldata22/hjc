<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LookupTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_zones(): void
    {
        Sanctum::actingAs(User::factory()->create());
        Zone::factory()->count(3)->create();

        $this->getJson('/api/zones')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_lists_churches(): void
    {
        Sanctum::actingAs(User::factory()->create());
        Church::factory()->count(2)->create();

        $this->getJson('/api/churches')->assertOk()->assertJsonCount(2, 'data');
    }
}
