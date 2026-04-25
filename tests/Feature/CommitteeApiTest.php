<?php
namespace Tests\Feature;

use App\Models\Committee;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommitteeApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_lists_committees_with_status_counts(): void
    {
        Committee::factory()->count(2)->create(['crusade_id' => $this->crusade->id, 'status' => 'on_track']);
        Committee::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'watch']);
        Committee::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'at_risk']);

        $r = $this->getJson('/api/committees');
        $r->assertOk()->assertJsonCount(4, 'data')
          ->assertJsonPath('meta.eyebrow_stats.on_track', 2)
          ->assertJsonPath('meta.eyebrow_stats.watch', 1)
          ->assertJsonPath('meta.eyebrow_stats.at_risk', 1);
    }

    public function test_can_create_committee(): void
    {
        $r = $this->postJson('/api/committees', [
            'crusade_id' => $this->crusade->id,
            'name' => 'Steering',
            'chair_name' => 'D. Boateng',
            'status' => 'on_track',
            'deliverables_done_pct' => 88,
            'member_count' => 7,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.name', 'Steering');
    }

    public function test_create_validates_status_enum(): void
    {
        $this->postJson('/api/committees', [
            'crusade_id' => $this->crusade->id,
            'name' => 'X', 'chair_name' => 'Y', 'status' => 'invalid',
        ])->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    public function test_can_update_committee(): void
    {
        $c = Committee::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'watch']);
        $this->patchJson("/api/committees/{$c->id}", ['status' => 'on_track'])
            ->assertOk()->assertJsonPath('data.status', 'on_track');
    }

    public function test_can_delete_committee(): void
    {
        $c = Committee::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->deleteJson("/api/committees/{$c->id}")->assertStatus(204);
        $this->assertDatabaseMissing('committees', ['id' => $c->id]);
    }
}
