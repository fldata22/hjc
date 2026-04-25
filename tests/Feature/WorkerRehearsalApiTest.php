<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\User;
use App\Models\WorkerRehearsal;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkerRehearsalApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_rehearsals(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        WorkerRehearsal::factory()->count(3)->sequence(
            ['session_number' => 1, 'group' => 'choir'],
            ['session_number' => 2, 'group' => 'choir'],
            ['session_number' => 1, 'group' => 'ushers'],
        )->create(['crusade_id' => $this->crusade->id, 'zone_id' => $zone->id]);

        $this->getJson('/api/worker-rehearsals')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_filters_by_group(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        WorkerRehearsal::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $zone->id,
            'group' => 'choir', 'session_number' => 1,
        ]);
        WorkerRehearsal::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $zone->id,
            'group' => 'ushers', 'session_number' => 1,
        ]);

        $this->getJson('/api/worker-rehearsals?group=choir')
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_can_create_rehearsal(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        $response = $this->postJson('/api/worker-rehearsals', [
            'crusade_id' => $this->crusade->id,
            'zone_id' => $zone->id,
            'group' => 'choir',
            'session_number' => 1,
            'attendance_count' => 94,
        ]);
        $response->assertStatus(201)->assertJsonPath('data.attendance_count', 94);
    }

    public function test_create_validates_group_enum(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->postJson('/api/worker-rehearsals', [
            'crusade_id' => $this->crusade->id,
            'zone_id' => $zone->id,
            'group' => 'invalid_group',
            'session_number' => 1,
            'attendance_count' => 10,
        ])->assertStatus(422)->assertJsonValidationErrors(['group']);
    }

    public function test_create_rejects_duplicate_session(): void
    {
        $zone = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        WorkerRehearsal::factory()->create([
            'crusade_id' => $this->crusade->id, 'zone_id' => $zone->id,
            'group' => 'choir', 'session_number' => 1,
        ]);
        $this->postJson('/api/worker-rehearsals', [
            'crusade_id' => $this->crusade->id,
            'zone_id' => $zone->id,
            'group' => 'choir',
            'session_number' => 1,
            'attendance_count' => 99,
        ])->assertStatus(422)->assertJsonValidationErrors(['session_number']);
    }

    public function test_can_patch_attendance(): void
    {
        $r = WorkerRehearsal::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/worker-rehearsals/{$r->id}", ['attendance_count' => 120])
            ->assertOk()->assertJsonPath('data.attendance_count', 120);
    }
}
