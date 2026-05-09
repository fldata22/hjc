<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\SeatingPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SeatingPlanApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_show_returns_null_when_no_plan(): void
    {
        $this->getJson('/api/seating-plan')
            ->assertStatus(200)
            ->assertJsonPath('data', null);
    }

    public function test_show_returns_existing_plan(): void
    {
        SeatingPlan::factory()->create([
            'crusade_id' => $this->crusade->id,
            'estimated_capacity' => 5000,
        ]);

        $this->getJson('/api/seating-plan')
            ->assertStatus(200)
            ->assertJsonPath('data.estimated_capacity', 5000);
    }

    public function test_upsert_creates_when_no_plan(): void
    {
        $this->putJson('/api/seating-plan', [
            'estimated_capacity' => 5000,
            'vip_seating_count' => 100,
            'general_seating_count' => 4800,
            'counsellor_area_count' => 100,
            'chair_source' => 'Wa Hotel rentals',
        ])->assertStatus(200)
            ->assertJsonPath('data.estimated_capacity', 5000)
            ->assertJsonPath('data.chair_source', 'Wa Hotel rentals');

        $this->assertDatabaseHas('seating_plans', [
            'crusade_id' => $this->crusade->id,
            'estimated_capacity' => 5000,
        ]);
    }

    public function test_upsert_updates_existing_plan(): void
    {
        SeatingPlan::factory()->create([
            'crusade_id' => $this->crusade->id,
            'estimated_capacity' => 1000,
        ]);

        $this->putJson('/api/seating-plan', [
            'estimated_capacity' => 5000,
        ])->assertStatus(200)
            ->assertJsonPath('data.estimated_capacity', 5000);

        $this->assertDatabaseCount('seating_plans', 1);
    }

    public function test_validates_negative_capacity(): void
    {
        $this->putJson('/api/seating-plan', [
            'estimated_capacity' => -100,
        ])->assertStatus(422)->assertJsonValidationErrors(['estimated_capacity']);
    }
}
