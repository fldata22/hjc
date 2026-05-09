<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\SoundLightingPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SoundLightingPlanApiTest extends TestCase
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
        $this->getJson('/api/sound-lighting-plan')
            ->assertStatus(200)
            ->assertJsonPath('data', null);
    }

    public function test_show_returns_existing_plan(): void
    {
        SoundLightingPlan::factory()->create([
            'crusade_id' => $this->crusade->id,
            'sound_provider' => 'Acme Sound Co',
        ]);

        $this->getJson('/api/sound-lighting-plan')
            ->assertStatus(200)
            ->assertJsonPath('data.sound_provider', 'Acme Sound Co');
    }

    public function test_upsert_creates_when_no_plan(): void
    {
        $this->putJson('/api/sound-lighting-plan', [
            'sound_provider' => 'Acme Sound Co',
            'generator_kva' => 100,
            'has_backup_power' => true,
        ])->assertStatus(200)
            ->assertJsonPath('data.sound_provider', 'Acme Sound Co')
            ->assertJsonPath('data.generator_kva', 100)
            ->assertJsonPath('data.has_backup_power', true);

        $this->assertDatabaseHas('sound_lighting_plans', [
            'crusade_id' => $this->crusade->id,
            'sound_provider' => 'Acme Sound Co',
        ]);
    }

    public function test_upsert_updates_existing_plan(): void
    {
        SoundLightingPlan::factory()->create([
            'crusade_id' => $this->crusade->id,
            'sound_provider' => 'Old Provider',
        ]);

        $this->putJson('/api/sound-lighting-plan', [
            'sound_provider' => 'New Provider',
        ])->assertStatus(200)
            ->assertJsonPath('data.sound_provider', 'New Provider');

        $this->assertDatabaseCount('sound_lighting_plans', 1);
    }

    public function test_validates_generator_kva_range(): void
    {
        $this->putJson('/api/sound-lighting-plan', [
            'generator_kva' => -50,
        ])->assertStatus(422)->assertJsonValidationErrors(['generator_kva']);
    }
}
