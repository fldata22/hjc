<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\TownProfile;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TownProfileApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    private Zone $zone;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
        $this->zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
    }

    public function test_index_returns_all_profiles(): void
    {
        $z2 = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        TownProfile::factory()->create(['zone_id' => $this->zone->id, 'language_primary' => 'Wala']);
        TownProfile::factory()->create(['zone_id' => $z2->id, 'language_primary' => 'Twi']);

        $this->getJson('/api/town-profiles')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_profile(): void
    {
        $response = $this->postJson('/api/town-profiles', [
            'zone_id' => $this->zone->id,
            'language_primary' => 'Wala',
            'religion_primary' => 'Mixed',
            'prior_crusade_year' => 2018,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.language_primary', 'Wala')
            ->assertJsonPath('data.religion_primary', 'Mixed')
            ->assertJsonPath('data.prior_crusade_year', 2018);
    }

    public function test_create_validates_required_zone_id(): void
    {
        $this->postJson('/api/town-profiles', [
            'language_primary' => 'Wala',
        ])->assertStatus(422)->assertJsonValidationErrors(['zone_id']);
    }

    public function test_create_rejects_duplicate_zone(): void
    {
        TownProfile::factory()->create(['zone_id' => $this->zone->id]);

        $this->postJson('/api/town-profiles', [
            'zone_id' => $this->zone->id,
            'language_primary' => 'Wala',
        ])->assertStatus(422)->assertJsonValidationErrors(['zone_id']);
    }

    public function test_can_show_profile(): void
    {
        $tp = TownProfile::factory()->create(['zone_id' => $this->zone->id, 'language_primary' => 'Wala']);

        $this->getJson("/api/town-profiles/{$tp->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.language_primary', 'Wala');
    }

    public function test_can_update_profile(): void
    {
        $tp = TownProfile::factory()->create(['zone_id' => $this->zone->id, 'language_primary' => 'Wala']);

        $this->patchJson("/api/town-profiles/{$tp->id}", [
            'language_primary' => 'Dagaare',
            'notes' => 'updated',
        ])->assertStatus(200)
            ->assertJsonPath('data.language_primary', 'Dagaare')
            ->assertJsonPath('data.notes', 'updated');
    }

    public function test_can_delete_profile(): void
    {
        $tp = TownProfile::factory()->create(['zone_id' => $this->zone->id]);

        $this->deleteJson("/api/town-profiles/{$tp->id}")->assertStatus(204);
        $this->assertDatabaseMissing('town_profiles', ['id' => $tp->id]);
    }

    public function test_validates_prior_crusade_year_range(): void
    {
        $this->postJson('/api/town-profiles', [
            'zone_id' => $this->zone->id,
            'prior_crusade_year' => 1500,
        ])->assertStatus(422)->assertJsonValidationErrors(['prior_crusade_year']);
    }
}
