<?php
namespace Tests\Feature;

use App\Models\AwarenessSurvey;
use App\Models\BudgetTransaction;
use App\Models\Conference;
use App\Models\ConferenceRegistration;
use App\Models\Crusade;
use App\Models\Pastor;
use App\Models\Permit;
use App\Models\Power;
use App\Models\User;
use App\Models\WeeklyAssessment;
use App\Models\WeeklyAssessmentReading;
use App\Models\WeeklyAssessmentRisk;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MissionControlApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_full_rollup(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $crusade = Crusade::factory()->create([
            'budget_total' => 80000, 'pastors_target' => 1088,
            'opens_at' => now()->addDays(7)->toDateString(),
            'population' => 2200000, 'pap' => 1800000,
        ]);

        Pastor::factory()->count(5)->create(['crusade_id' => $crusade->id, 'pipeline_stage' => 'active']);
        Pastor::factory()->count(3)->create(['crusade_id' => $crusade->id, 'pipeline_stage' => 'champion']);

        $z = Zone::factory()->create(['crusade_id' => $crusade->id]);
        AwarenessSurvey::factory()->create([
            'crusade_id' => $crusade->id, 'zone_id' => $z->id,
            'survey_number' => 6, 'surveyed_count' => 100, 'attending_yes_count' => 21,
        ]);

        BudgetTransaction::factory()->create([
            'crusade_id' => $crusade->id, 'kind' => 'expense', 'amount' => 43800, 'budget_category_id' => null,
        ]);

        $conf = Conference::factory()->create(['crusade_id' => $crusade->id, 'capacity' => 820]);
        ConferenceRegistration::factory()->count(3)->create(['conference_id' => $conf->id]);

        Permit::factory()->count(2)->create(['crusade_id' => $crusade->id, 'status' => 'approved']);
        Permit::factory()->create(['crusade_id' => $crusade->id, 'status' => 'in_review']);

        $a = WeeklyAssessment::factory()->create(['crusade_id' => $crusade->id, 'week_number' => 8]);
        WeeklyAssessmentReading::factory()->create([
            'weekly_assessment_id' => $a->id,
            'power_id' => Power::where('code', 'pastors')->first()->id,
            'value_pct' => 78,
        ]);
        WeeklyAssessmentReading::factory()->create([
            'weekly_assessment_id' => $a->id,
            'power_id' => Power::where('code', 'awareness')->first()->id,
            'value_pct' => 21,
        ]);
        WeeklyAssessmentRisk::factory()->create([
            'weekly_assessment_id' => $a->id, 'ordering' => 1, 'severity' => 'critical',
            'text' => 'Worker groups at 2%',
        ]);

        $r = $this->getJson('/api/mission-control');
        $r->assertOk();

        $this->assertSame(7, $r->json('data.top_stats.days_to_go'));
        $this->assertSame('43800.00', $r->json('data.top_stats.financial.spent'));
        $this->assertSame('80000.00', $r->json('data.top_stats.financial.total'));
        $this->assertSame('54.75', $r->json('data.top_stats.financial.pct'));
        $this->assertSame(8, $r->json('data.top_stats.pastors_won.n'));
        $this->assertSame(1088, $r->json('data.top_stats.pastors_won.target'));
        $this->assertSame('21.00', $r->json('data.top_stats.awareness_pct'));

        $powers = collect($r->json('data.powers'));
        $this->assertCount(14, $powers);
        // Pillars derive from operational data when available, overriding the manual weekly reading.
        // 8 active+champion pastors / 1088 target = 1% — ops overrides the manual 78.
        $pastorsRow = $powers->firstWhere('code', 'pastors');
        $this->assertSame(1, $pastorsRow['value_pct']);
        $this->assertSame('derived', $pastorsRow['source']);
        $this->assertSame('danger', $pastorsRow['status']);
        // Awareness: 21/100 survey = 21% (matches the manual reading either way).
        $awarenessRow = $powers->firstWhere('code', 'awareness');
        $this->assertSame(21, $awarenessRow['value_pct']);
        $this->assertSame('derived', $awarenessRow['source']);
        $this->assertSame('danger', $awarenessRow['status']);

        $this->assertSame(2200000, $r->json('data.context.population'));
        $this->assertSame(1, $r->json('data.context.zones_count'));
        $this->assertSame(3, $r->json('data.context.conference_registered'));
        $this->assertSame(820, $r->json('data.context.conference_capacity'));
        $this->assertSame(2, $r->json('data.context.permits_approved'));
        $this->assertSame(3, $r->json('data.context.permits_total'));

        $this->assertCount(1, $r->json('data.top_risks'));
        $this->assertSame('critical', $r->json('data.top_risks.0.severity'));
    }

    public function test_handles_missing_assessment_gracefully(): void
    {
        Sanctum::actingAs(User::factory()->create());
        Crusade::factory()->create();

        $r = $this->getJson('/api/mission-control');
        $r->assertOk();
        $this->assertCount(14, $r->json('data.powers'));
        $first = $r->json('data.powers.0');
        $this->assertNull($first['value_pct']);
        $this->assertSame('muted', $first['status']);
    }
}
