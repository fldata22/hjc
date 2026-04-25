<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\PledgeMeeting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PledgeMeetingApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_meetings(): void
    {
        PledgeMeeting::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);
        $this->getJson('/api/pledge-meetings')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_can_create_meeting(): void
    {
        $response = $this->postJson('/api/pledge-meetings', [
            'crusade_id' => $this->crusade->id,
            'sequence' => 'M5',
            'held_on' => '2026-04-30',
            'venue' => 'Bishop residence',
            'status' => 'upcoming',
        ]);
        $response->assertStatus(201)->assertJsonPath('data.sequence', 'M5');
    }

    public function test_create_rejects_duplicate_sequence_in_crusade(): void
    {
        PledgeMeeting::factory()->create(['crusade_id' => $this->crusade->id, 'sequence' => 'M1']);
        $this->postJson('/api/pledge-meetings', [
            'crusade_id' => $this->crusade->id,
            'sequence' => 'M1',
            'held_on' => '2026-04-30',
            'venue' => 'X',
        ])->assertStatus(422)->assertJsonValidationErrors(['sequence']);
    }

    public function test_can_update_status(): void
    {
        $m = PledgeMeeting::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'upcoming']);
        $this->patchJson("/api/pledge-meetings/{$m->id}", ['status' => 'done'])
            ->assertOk()->assertJsonPath('data.status', 'done');
    }
}
