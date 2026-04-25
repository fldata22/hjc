<?php
namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Stakeholder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StakeholderApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_stakeholders_sortable_by_pipeline(): void
    {
        Stakeholder::factory()->create(['crusade_id' => $this->crusade->id, 'pipeline_stage' => 1, 'status_label' => 'identified']);
        Stakeholder::factory()->create(['crusade_id' => $this->crusade->id, 'pipeline_stage' => 4, 'status_label' => 'won']);
        $this->getJson('/api/stakeholders')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_can_create(): void
    {
        $r = $this->postJson('/api/stakeholders', [
            'crusade_id' => $this->crusade->id,
            'name' => 'Mayor Tembo', 'org' => 'City of Lusaka', 'role' => 'Mayor',
            'pipeline_stage' => 4, 'status_label' => 'won',
        ]);
        $r->assertStatus(201)->assertJsonPath('data.name', 'Mayor Tembo');
    }

    public function test_validates_pipeline_stage_range(): void
    {
        $this->postJson('/api/stakeholders', [
            'crusade_id' => $this->crusade->id,
            'name' => 'X', 'org' => 'Y', 'role' => 'Z',
            'pipeline_stage' => 5, 'status_label' => 'won',
        ])->assertStatus(422)->assertJsonValidationErrors(['pipeline_stage']);
    }

    public function test_can_update_and_delete(): void
    {
        $s = Stakeholder::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/stakeholders/{$s->id}", ['pipeline_stage' => 3, 'status_label' => 'committed'])
            ->assertOk()->assertJsonPath('data.pipeline_stage', 3);
        $this->deleteJson("/api/stakeholders/{$s->id}")->assertStatus(204);
    }
}
