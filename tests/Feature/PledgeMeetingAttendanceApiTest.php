<?php

namespace Tests\Feature;

use App\Models\Pastor;
use App\Models\PledgeMeeting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PledgeMeetingAttendanceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_record_bulk_attendance(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $meeting = PledgeMeeting::factory()->create();
        $p1 = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);
        $p2 = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);

        $response = $this->postJson("/api/pledge-meetings/{$meeting->id}/attendances", [
            'pastor_ids' => [$p1->id, $p2->id],
        ]);

        $response->assertOk()->assertJsonPath('data.attendees_count', 2);
        $this->assertDatabaseHas('pledge_meeting_attendances', ['pledge_meeting_id' => $meeting->id, 'pastor_id' => $p1->id]);
    }

    public function test_attendance_is_idempotent(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $meeting = PledgeMeeting::factory()->create();
        $p = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);

        $this->postJson("/api/pledge-meetings/{$meeting->id}/attendances", ['pastor_ids' => [$p->id]])->assertOk();
        $this->postJson("/api/pledge-meetings/{$meeting->id}/attendances", ['pastor_ids' => [$p->id]])
            ->assertOk()
            ->assertJsonPath('data.attendees_count', 1);
    }
}
