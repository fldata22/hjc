<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\OutreachActivity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OutreachActivityApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_filters_by_kind(): void
    {
        OutreachActivity::factory()->create(['crusade_id' => $this->crusade->id, 'kind' => 'door_to_door']);
        OutreachActivity::factory()->count(2)->create(['crusade_id' => $this->crusade->id, 'kind' => 'convoy']);

        $this->getJson('/api/outreach-activities?kind=door_to_door')->assertStatus(200)->assertJsonCount(1, 'data');
        $this->getJson('/api/outreach-activities?kind=convoy')->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_can_create_door_to_door(): void
    {
        $this->postJson('/api/outreach-activities', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'door_to_door',
            'occurred_on' => '2026-04-15',
            'team_lead_name' => 'Sister Akua',
            'households_reached' => 120,
            'conversations_count' => 45,
        ])->assertStatus(201)
            ->assertJsonPath('data.kind', 'door_to_door')
            ->assertJsonPath('data.households_reached', 120);
    }

    public function test_can_create_convoy(): void
    {
        $this->postJson('/api/outreach-activities', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'convoy',
            'occurred_on' => '2026-04-15',
            'route_summary' => 'Wa-Central → Wa-North radio drops',
            'households_reached' => 800,
        ])->assertStatus(201)
            ->assertJsonPath('data.kind', 'convoy')
            ->assertJsonPath('data.route_summary', 'Wa-Central → Wa-North radio drops');
    }

    public function test_validates_kind_and_required(): void
    {
        $this->postJson('/api/outreach-activities', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'totally-bogus',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['kind', 'occurred_on']);
    }

    public function test_can_update_and_delete(): void
    {
        $a = OutreachActivity::factory()->create(['crusade_id' => $this->crusade->id, 'households_reached' => 50]);
        $this->patchJson("/api/outreach-activities/{$a->id}", ['households_reached' => 75])->assertStatus(200)->assertJsonPath('data.households_reached', 75);
        $this->deleteJson("/api/outreach-activities/{$a->id}")->assertStatus(204);
        $this->assertDatabaseMissing('outreach_activities', ['id' => $a->id]);
    }
}
