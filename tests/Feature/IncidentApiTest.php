<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Incident;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IncidentApiTest extends TestCase
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
        Incident::factory()->create(['crusade_id' => $this->crusade->id, 'kind' => 'security']);
        Incident::factory()->count(2)->create(['crusade_id' => $this->crusade->id, 'kind' => 'medical']);

        $this->getJson('/api/incidents?kind=security')->assertStatus(200)->assertJsonCount(1, 'data');
        $this->getJson('/api/incidents?kind=medical')->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_can_create_security_incident(): void
    {
        $this->postJson('/api/incidents', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'security',
            'occurred_on' => '2026-04-15',
            'severity' => 'medium',
            'description' => 'Crowd surge near front rail',
        ])->assertStatus(201)
            ->assertJsonPath('data.kind', 'security')
            ->assertJsonPath('data.severity', 'medium');
    }

    public function test_can_create_medical_incident(): void
    {
        $this->postJson('/api/incidents', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'medical',
            'occurred_on' => '2026-04-15',
            'severity' => 'high',
            'description' => 'Suspected dehydration',
            'transported_to' => 'Wa General Hospital',
        ])->assertStatus(201)
            ->assertJsonPath('data.kind', 'medical')
            ->assertJsonPath('data.transported_to', 'Wa General Hospital');
    }

    public function test_validates_kind_and_severity_enum(): void
    {
        $this->postJson('/api/incidents', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'totally-bogus',
            'occurred_on' => '2026-04-15',
            'severity' => 'apocalyptic',
            'description' => 'X',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['kind', 'severity']);
    }

    public function test_validates_required_description(): void
    {
        $this->postJson('/api/incidents', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'security',
            'occurred_on' => '2026-04-15',
        ])->assertStatus(422)->assertJsonValidationErrors(['description']);
    }

    public function test_can_update_and_delete(): void
    {
        $i = Incident::factory()->create(['crusade_id' => $this->crusade->id, 'severity' => 'low']);
        $this->patchJson("/api/incidents/{$i->id}", ['severity' => 'high'])->assertStatus(200)->assertJsonPath('data.severity', 'high');
        $this->deleteJson("/api/incidents/{$i->id}")->assertStatus(204);
        $this->assertDatabaseMissing('incidents', ['id' => $i->id]);
    }
}
