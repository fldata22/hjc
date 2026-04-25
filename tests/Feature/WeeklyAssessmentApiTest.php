<?php
namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Power;
use App\Models\User;
use App\Models\WeeklyAssessment;
use App\Models\WeeklyAssessmentReading;
use App\Models\WeeklyAssessmentRisk;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WeeklyAssessmentApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_assessments_most_recent_first(): void
    {
        WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id, 'week_number' => 1]);
        WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id, 'week_number' => 2]);
        $r = $this->getJson('/api/weekly-assessments');
        $r->assertOk()->assertJsonCount(2, 'data');
        $this->assertSame(2, $r->json('data.0.week_number'));
    }

    public function test_can_create_assessment(): void
    {
        $r = $this->postJson('/api/weekly-assessments', [
            'crusade_id' => $this->crusade->id,
            'week_number' => 8,
            'prompted_at' => '2026-04-19 21:00:00',
            'self_score' => 6,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.week_number', 8);
    }

    public function test_create_rejects_duplicate_week(): void
    {
        WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id, 'week_number' => 8]);
        $this->postJson('/api/weekly-assessments', [
            'crusade_id' => $this->crusade->id, 'week_number' => 8,
            'prompted_at' => '2026-04-19 21:00:00',
        ])->assertStatus(422)->assertJsonValidationErrors(['week_number']);
    }

    public function test_show_includes_readings_and_risks(): void
    {
        $a = WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id]);
        $power = Power::where('code', 'pastors')->first();
        WeeklyAssessmentReading::factory()->create(['weekly_assessment_id' => $a->id, 'power_id' => $power->id, 'value_pct' => 78]);
        WeeklyAssessmentRisk::factory()->create(['weekly_assessment_id' => $a->id, 'ordering' => 1, 'severity' => 'critical', 'text' => 'Awareness still red']);

        $r = $this->getJson("/api/weekly-assessments/{$a->id}");
        $r->assertOk()
          ->assertJsonStructure(['data' => ['id', 'readings', 'risks']]);
        $this->assertCount(1, $r->json('data.readings'));
        $this->assertCount(1, $r->json('data.risks'));
    }

    public function test_can_submit_assessment(): void
    {
        $a = WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id, 'submitted_at' => null]);
        $r = $this->postJson("/api/weekly-assessments/{$a->id}/submit");
        $r->assertOk();
        $this->assertNotNull($a->fresh()->submitted_at);
    }

    public function test_latest_returns_most_recent_with_data(): void
    {
        WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id, 'week_number' => 1]);
        $latest = WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id, 'week_number' => 2]);
        $power = Power::where('code', 'pastors')->first();
        WeeklyAssessmentReading::factory()->create(['weekly_assessment_id' => $latest->id, 'power_id' => $power->id, 'value_pct' => 78]);

        $r = $this->getJson('/api/weekly-assessments/latest');
        $r->assertOk()->assertJsonPath('data.week_number', 2);
        $this->assertCount(1, $r->json('data.readings'));
    }

    public function test_bulk_replace_readings(): void
    {
        $a = WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id]);
        $p1 = Power::where('code', 'pastors')->first();
        $p2 = Power::where('code', 'awareness')->first();
        WeeklyAssessmentReading::factory()->create(['weekly_assessment_id' => $a->id, 'power_id' => $p1->id, 'value_pct' => 50]);

        $r = $this->putJson("/api/weekly-assessments/{$a->id}/readings", [
            'readings' => [
                ['power_id' => $p1->id, 'value_pct' => 78],
                ['power_id' => $p2->id, 'value_pct' => 21],
            ],
        ]);
        $r->assertOk();
        $this->assertCount(2, $a->fresh()->readings);
        $this->assertSame(78, $a->fresh()->readings()->where('power_id', $p1->id)->value('value_pct'));
    }

    public function test_bulk_replace_risks(): void
    {
        $a = WeeklyAssessment::factory()->create(['crusade_id' => $this->crusade->id]);
        $r = $this->putJson("/api/weekly-assessments/{$a->id}/risks", [
            'risks' => [
                ['ordering' => 1, 'severity' => 'critical', 'text' => 'Awareness red'],
                ['ordering' => 2, 'severity' => 'critical', 'text' => 'Worker rehearsals stuck'],
                ['ordering' => 3, 'severity' => 'high', 'text' => 'Crusade permit pending'],
            ],
        ]);
        $r->assertOk();
        $this->assertCount(3, $a->fresh()->risks);
    }
}
