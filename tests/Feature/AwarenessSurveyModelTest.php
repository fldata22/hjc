<?php

namespace Tests\Feature;

use App\Models\AwarenessSurvey;
use App\Models\Crusade;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AwarenessSurveyModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_pct_is_derived(): void
    {
        $survey = AwarenessSurvey::factory()->create([
            'surveyed_count' => 100,
            'attending_yes_count' => 28,
        ]);
        $this->assertSame(28.0, $survey->pct);
    }

    public function test_pct_handles_zero_surveyed(): void
    {
        $survey = AwarenessSurvey::factory()->create([
            'surveyed_count' => 0,
            'attending_yes_count' => 0,
        ]);
        $this->assertSame(0.0, $survey->pct);
    }

    public function test_unique_constraint_per_zone_survey(): void
    {
        $crusade = Crusade::factory()->create();
        $zone = Zone::factory()->create(['crusade_id' => $crusade->id]);
        AwarenessSurvey::factory()->create(['crusade_id' => $crusade->id, 'zone_id' => $zone->id, 'survey_number' => 1]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        AwarenessSurvey::factory()->create(['crusade_id' => $crusade->id, 'zone_id' => $zone->id, 'survey_number' => 1]);
    }
}
