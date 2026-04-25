<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\CrusadeTarget;
use App\Models\Pastor;
use App\Models\Pledge;
use App\Models\PledgeMeeting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PledgeSummaryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_summary_returns_pledged_vs_target_per_resource(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $crusade = Crusade::factory()->create();
        $meeting = PledgeMeeting::factory()->create(['crusade_id' => $crusade->id]);
        $pastor = Pastor::factory()->create(['crusade_id' => $crusade->id]);

        CrusadeTarget::factory()->create(['crusade_id' => $crusade->id, 'resource' => 'choir', 'target_quantity' => 150]);
        CrusadeTarget::factory()->create(['crusade_id' => $crusade->id, 'resource' => 'ushers', 'target_quantity' => 300]);

        Pledge::factory()->create(['pastor_id' => $pastor->id, 'pledge_meeting_id' => $meeting->id, 'resource' => 'choir', 'quantity' => 98]);
        Pledge::factory()->create(['pastor_id' => $pastor->id, 'pledge_meeting_id' => $meeting->id, 'resource' => 'ushers', 'quantity' => 180]);

        $response = $this->getJson('/api/pledges/summary');
        $response->assertOk()
            ->assertJsonPath('data.choir.pledged', '98.00')
            ->assertJsonPath('data.choir.target', '150.00')
            ->assertJsonPath('data.ushers.pledged', '180.00')
            ->assertJsonPath('data.ushers.target', '300.00');
    }
}
