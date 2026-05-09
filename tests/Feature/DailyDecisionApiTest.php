<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\DailyDecision;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DailyDecisionApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_returns_records(): void
    {
        DailyDecision::factory()->count(2)->create(['crusade_id' => $this->crusade->id]);

        $this->getJson('/api/daily-decisions')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create(): void
    {
        $this->postJson('/api/daily-decisions', [
            'crusade_id' => $this->crusade->id,
            'decided_on' => '2026-04-15',
            'salvations' => 200,
            'rededications' => 50,
            'healings' => 10,
            'counselled' => 250,
        ])->assertStatus(201)
            ->assertJsonPath('data.salvations', 200)
            ->assertJsonPath('data.healings', 10);
    }

    public function test_validates_required_and_negative(): void
    {
        $this->postJson('/api/daily-decisions', [
            'crusade_id' => $this->crusade->id,
            'salvations' => -5,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['decided_on', 'salvations']);
    }

    public function test_can_update_and_delete(): void
    {
        $r = DailyDecision::factory()->create(['crusade_id' => $this->crusade->id, 'salvations' => 10]);

        $this->patchJson("/api/daily-decisions/{$r->id}", ['salvations' => 25])
            ->assertStatus(200)->assertJsonPath('data.salvations', 25);

        $this->deleteJson("/api/daily-decisions/{$r->id}")->assertStatus(204);
        $this->assertDatabaseMissing('daily_decisions', ['id' => $r->id]);
    }
}
