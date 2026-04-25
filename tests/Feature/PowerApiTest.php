<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PowerApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_all_14_powers_ordered(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $response = $this->getJson('/api/powers');
        $response->assertOk()->assertJsonCount(14, 'data');
        $this->assertSame('pastors', $response->json('data.0.code'));
    }

    public function test_show_by_code(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/powers/awareness')
            ->assertOk()
            ->assertJsonPath('data.code', 'awareness')
            ->assertJsonPath('data.name', 'Awareness');
    }

    public function test_show_unknown_code_returns_404(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/powers/no-such-power')->assertStatus(404);
    }
}
