<?php

namespace Tests\Feature;

use App\Models\Pastor;
use App\Models\PledgeMeeting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PledgeMeetingPledgesApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_record_bulk_pledges(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $meeting = PledgeMeeting::factory()->create();
        $p1 = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);
        $p2 = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);

        $response = $this->postJson("/api/pledge-meetings/{$meeting->id}/pledges", [
            'pledges' => [
                ['pastor_id' => $p1->id, 'resource' => 'ushers', 'quantity' => 12],
                ['pastor_id' => $p1->id, 'resource' => 'counsellors', 'quantity' => 4],
                ['pastor_id' => $p2->id, 'resource' => 'choir', 'quantity' => 6],
            ],
        ]);

        $response->assertOk()->assertJsonPath('data.created', 3);
        $this->assertDatabaseCount('pledges', 3);
    }

    public function test_validates_resource_enum(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $meeting = PledgeMeeting::factory()->create();
        $p1 = Pastor::factory()->create(['crusade_id' => $meeting->crusade_id]);

        $this->postJson("/api/pledge-meetings/{$meeting->id}/pledges", [
            'pledges' => [['pastor_id' => $p1->id, 'resource' => 'invalid', 'quantity' => 1]],
        ])->assertStatus(422)->assertJsonValidationErrors(['pledges.0.resource']);
    }
}
