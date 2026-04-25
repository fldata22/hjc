<?php

namespace Tests\Feature;

use App\Models\AwarenessSurvey;
use App\Models\Crusade;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AwarenessSurveyApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_surveys(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        AwarenessSurvey::factory()->count(3)->sequence(
            ['survey_number' => 1], ['survey_number' => 2], ['survey_number' => 3]
        )->create(['crusade_id' => $this->crusade->id, 'zone_id' => $zone->id]);

        $this->getJson('/api/awareness-surveys')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_filters_by_zone(): void
    {
        $z1 = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        $z2 = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        AwarenessSurvey::factory()->create(['crusade_id' => $this->crusade->id, 'zone_id' => $z1->id, 'survey_number' => 1]);
        AwarenessSurvey::factory()->create(['crusade_id' => $this->crusade->id, 'zone_id' => $z2->id, 'survey_number' => 1]);

        $this->getJson("/api/awareness-surveys?zone_id={$z1->id}")
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_can_create_survey(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        $response = $this->postJson('/api/awareness-surveys', [
            'crusade_id' => $this->crusade->id,
            'zone_id' => $zone->id,
            'survey_number' => 1,
            'surveyed_count' => 100,
            'attending_yes_count' => 28,
            'taken_on' => '2026-04-10',
        ]);
        $response->assertStatus(201)
            ->assertJsonPath('data.surveyed_count', 100)
            ->assertJsonPath('data.attending_yes_count', 28);
    }

    public function test_create_rejects_attending_greater_than_surveyed(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->postJson('/api/awareness-surveys', [
            'crusade_id' => $this->crusade->id,
            'zone_id' => $zone->id,
            'survey_number' => 1,
            'surveyed_count' => 50,
            'attending_yes_count' => 100,
            'taken_on' => '2026-04-10',
        ])->assertStatus(422)->assertJsonValidationErrors(['attending_yes_count']);
    }

    public function test_create_rejects_duplicate_zone_survey(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        AwarenessSurvey::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $zone->id, 'survey_number' => 1,
        ]);
        $this->postJson('/api/awareness-surveys', [
            'crusade_id' => $this->crusade->id,
            'zone_id' => $zone->id,
            'survey_number' => 1,
            'surveyed_count' => 80,
            'attending_yes_count' => 20,
            'taken_on' => '2026-04-12',
        ])->assertStatus(422)->assertJsonValidationErrors(['survey_number']);
    }

    public function test_can_patch_counts(): void
    {
        $survey = AwarenessSurvey::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/awareness-surveys/{$survey->id}", [
            'surveyed_count' => 150,
            'attending_yes_count' => 60,
        ])->assertOk()->assertJsonPath('data.surveyed_count', 150);
    }

    public function test_trajectory_returns_weighted_average_per_survey_number(): void
    {
        $z1 = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        $z2 = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        // Survey 1: zone1 100 surveyed, 30 yes; zone2 50 surveyed, 10 yes
        // Weighted: (30+10) / (100+50) = 40/150 = 26.67
        AwarenessSurvey::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $z1->id, 'survey_number' => 1,
            'surveyed_count' => 100, 'attending_yes_count' => 30,
        ]);
        AwarenessSurvey::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $z2->id, 'survey_number' => 1,
            'surveyed_count' => 50, 'attending_yes_count' => 10,
        ]);

        $response = $this->getJson('/api/awareness-surveys/trajectory');
        $response->assertOk();
        $row = collect($response->json('data'))->firstWhere('survey_number', 1);
        $this->assertSame(150, $row['surveyed_total']);
        $this->assertSame(40, $row['attending_yes_total']);
        $this->assertSame('26.67', $row['pct']);
    }
}
