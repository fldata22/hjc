<?php

namespace Tests\Feature;

use App\Models\Pastor;
use App\Models\PledgeMeeting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PledgeMeetingModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_meeting_tracks_attendees_via_pivot(): void
    {
        $meeting = PledgeMeeting::factory()->create();
        $pastor = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);
        $meeting->attendees()->attach($pastor->id);

        $this->assertCount(1, $meeting->fresh()->attendees);
    }

    public function test_attendance_is_unique(): void
    {
        $meeting = PledgeMeeting::factory()->create();
        $pastor = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);
        $meeting->attendees()->attach($pastor->id);

        $this->expectException(\Illuminate\Database\QueryException::class);
        $meeting->attendees()->attach($pastor->id);
    }
}
