<?php

namespace Tests\Feature;

use App\Models\Pastor;
use App\Models\PastorIdentification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PastorIdentificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_identifications_for_pastor(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $pastor = Pastor::factory()->create();
        PastorIdentification::factory()->count(2)->create(['pastor_id' => $pastor->id]);

        $this->getJson("/api/pastors/{$pastor->id}/identifications")
            ->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_can_add_identification(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $pastor = Pastor::factory()->create();

        $response = $this->postJson("/api/pastors/{$pastor->id}/identifications", [
            'category' => 'BOT',
            'sub_role' => 'chair',
            'assigned_at' => '2026-03-11',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.category', 'BOT');
        $this->assertDatabaseHas('pastor_identifications', ['pastor_id' => $pastor->id, 'category' => 'BOT']);
    }

    public function test_add_validates_required(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $pastor = Pastor::factory()->create();

        $this->postJson("/api/pastors/{$pastor->id}/identifications", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category', 'assigned_at']);
    }
}
