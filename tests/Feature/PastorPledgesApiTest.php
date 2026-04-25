<?php

namespace Tests\Feature;

use App\Models\Pastor;
use App\Models\Pledge;
use App\Models\PledgeMeeting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PastorPledgesApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_pledges_aggregated_by_resource(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $pastor = Pastor::factory()->create();
        $m1 = PledgeMeeting::factory()->create(['crusade_id' => $pastor->crusade_id]);
        $m2 = PledgeMeeting::factory()->create(['crusade_id' => $pastor->crusade_id]);

        Pledge::factory()->create(['pastor_id' => $pastor->id, 'pledge_meeting_id' => $m1->id, 'resource' => 'ushers', 'quantity' => 8]);
        Pledge::factory()->create(['pastor_id' => $pastor->id, 'pledge_meeting_id' => $m2->id, 'resource' => 'ushers', 'quantity' => 4]);
        Pledge::factory()->create(['pastor_id' => $pastor->id, 'pledge_meeting_id' => $m1->id, 'resource' => 'counsellors', 'quantity' => 4]);

        $response = $this->getJson("/api/pastors/{$pastor->id}/pledges");
        $response->assertOk()
            ->assertJsonPath('data.ushers', '12.00')
            ->assertJsonPath('data.counsellors', '4.00');
    }
}
