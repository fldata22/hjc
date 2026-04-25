<?php
namespace Tests\Feature;

use App\Models\Conference;
use App\Models\ConferenceSession;
use App\Models\ConferenceTrack;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConferenceSessionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_sessions(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        ConferenceSession::factory()->count(3)->create(['conference_id' => $c->id]);
        $this->getJson("/api/conferences/{$c->id}/sessions")->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_can_add_plenary_session(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        $r = $this->postJson("/api/conferences/{$c->id}/sessions", [
            'day_label' => 'Day 1 — Wed', 'name' => 'Identity', 'speaker' => 'Bishop Boateng',
            'session_kind' => 'plenary', 'rsvp_count' => 520,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.session_kind', 'plenary');
    }

    public function test_can_add_track_session(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        $t = ConferenceTrack::factory()->create(['conference_id' => $c->id]);
        $this->postJson("/api/conferences/{$c->id}/sessions", [
            'day_label' => 'Day 1 — Wed', 'name' => 'Worship Lab', 'speaker' => 'M. Chanda',
            'session_kind' => 'track', 'track_id' => $t->id,
        ])->assertStatus(201)->assertJsonPath('data.track_id', $t->id);
    }

    public function test_validates_session_kind(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        $this->postJson("/api/conferences/{$c->id}/sessions", [
            'day_label' => 'X', 'name' => 'Y', 'session_kind' => 'invalid',
        ])->assertStatus(422)->assertJsonValidationErrors(['session_kind']);
    }

    public function test_can_update_and_delete(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $s = ConferenceSession::factory()->create();
        $this->patchJson("/api/conference-sessions/{$s->id}", ['rsvp_count' => 100])
            ->assertOk()->assertJsonPath('data.rsvp_count', 100);
        $this->deleteJson("/api/conference-sessions/{$s->id}")->assertStatus(204);
    }
}
