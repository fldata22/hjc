<?php

namespace Tests\Feature;

use App\Models\Pastor;
use App\Models\Pledge;
use App\Models\PledgeMeeting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PledgeModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_pledge_relates_to_pastor_and_meeting(): void
    {
        $pastor = Pastor::factory()->create();
        $meeting = PledgeMeeting::factory()->create();
        $pledge = Pledge::factory()->create([
            'pastor_id' => $pastor->id,
            'pledge_meeting_id' => $meeting->id,
            'resource' => 'ushers',
            'quantity' => 12,
        ]);

        $this->assertSame($pastor->id, $pledge->pastor->id);
        $this->assertSame($meeting->id, $pledge->meeting->id);
        $this->assertSame('12.00', (string) $pledge->quantity);
    }
}
