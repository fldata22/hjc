<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\WorkerRehearsal;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkerRehearsalModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_unique_per_zone_group_session(): void
    {
        $crusade = Crusade::factory()->create();
        $zone = Zone::factory()->create(['crusade_id' => $crusade->id]);
        WorkerRehearsal::factory()->create([
            'crusade_id' => $crusade->id, 'zone_id' => $zone->id,
            'group' => 'choir', 'session_number' => 1, 'attendance_count' => 50,
        ]);
        $this->expectException(\Illuminate\Database\QueryException::class);
        WorkerRehearsal::factory()->create([
            'crusade_id' => $crusade->id, 'zone_id' => $zone->id,
            'group' => 'choir', 'session_number' => 1, 'attendance_count' => 60,
        ]);
    }

    public function test_belongs_to_crusade_and_zone(): void
    {
        $r = WorkerRehearsal::factory()->create();
        $this->assertInstanceOf(Crusade::class, $r->crusade);
        $this->assertInstanceOf(Zone::class, $r->zone);
    }
}
