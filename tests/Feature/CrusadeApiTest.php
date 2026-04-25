<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CrusadeApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_current_crusade(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $crusade = Crusade::factory()->create(['name' => 'Lusaka 2026']);

        $response = $this->getJson('/api/crusade');

        $response->assertOk()
            ->assertJsonPath('data.name', 'Lusaka 2026')
            ->assertJsonPath('data.city', 'Lusaka');
    }

    public function test_returns_404_when_no_crusade_exists(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/crusade')->assertStatus(404);
    }
}
