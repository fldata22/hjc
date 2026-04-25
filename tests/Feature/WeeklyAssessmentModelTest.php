<?php
namespace Tests\Feature;

use App\Models\Power;
use App\Models\WeeklyAssessment;
use App\Models\WeeklyAssessmentReading;
use App\Models\WeeklyAssessmentRisk;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WeeklyAssessmentModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_assessment_with_readings_and_risks(): void
    {
        $a = WeeklyAssessment::factory()->create();
        $power = Power::where('code', 'awareness')->first();
        WeeklyAssessmentReading::factory()->create(['weekly_assessment_id' => $a->id, 'power_id' => $power->id, 'value_pct' => 21]);
        WeeklyAssessmentRisk::factory()->create(['weekly_assessment_id' => $a->id, 'ordering' => 1, 'severity' => 'critical']);
        WeeklyAssessmentRisk::factory()->create(['weekly_assessment_id' => $a->id, 'ordering' => 2, 'severity' => 'high']);

        $a = $a->fresh();
        $this->assertCount(1, $a->readings);
        $this->assertCount(2, $a->risks);
        $this->assertSame(1, $a->risks[0]->ordering);
    }

    public function test_unique_reading_per_power_per_assessment(): void
    {
        $a = WeeklyAssessment::factory()->create();
        $p = Power::where('code', 'pastors')->first();
        WeeklyAssessmentReading::factory()->create(['weekly_assessment_id' => $a->id, 'power_id' => $p->id, 'value_pct' => 50]);
        $this->expectException(\Illuminate\Database\QueryException::class);
        WeeklyAssessmentReading::factory()->create(['weekly_assessment_id' => $a->id, 'power_id' => $p->id, 'value_pct' => 60]);
    }
}
