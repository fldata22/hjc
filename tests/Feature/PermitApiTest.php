<?php
namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Permit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PermitApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_with_status_counts(): void
    {
        Permit::factory()->count(2)->create(['crusade_id' => $this->crusade->id, 'status' => 'approved']);
        Permit::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'in_review']);

        $r = $this->getJson('/api/permits');
        $r->assertOk()->assertJsonCount(3, 'data')
          ->assertJsonPath('meta.status_counts.approved', 2)
          ->assertJsonPath('meta.status_counts.in_review', 1);
    }

    public function test_can_create_permit(): void
    {
        $r = $this->postJson('/api/permits', [
            'crusade_id' => $this->crusade->id,
            'name' => 'Sound clearance', 'agency' => 'Environmental', 'status' => 'approved',
            'signed_on' => '2026-04-09',
        ]);
        $r->assertStatus(201)->assertJsonPath('data.status', 'approved');
    }

    public function test_can_update_status(): void
    {
        $p = Permit::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'in_review']);
        $this->patchJson("/api/permits/{$p->id}", ['status' => 'approved', 'signed_on' => '2026-04-25'])
            ->assertOk()->assertJsonPath('data.status', 'approved');
    }

    public function test_can_delete_permit(): void
    {
        $p = Permit::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->deleteJson("/api/permits/{$p->id}")->assertStatus(204);
    }
}
