<?php
namespace Tests\Feature;

use App\Models\Conference;
use App\Models\ConferenceTrack;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConferenceTrackApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_tracks_for_conference(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        ConferenceTrack::factory()->count(3)->create(['conference_id' => $c->id]);
        $this->getJson("/api/conferences/{$c->id}/tracks")->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_can_add_track(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        $r = $this->postJson("/api/conferences/{$c->id}/tracks", ['name' => 'Worship & arts', 'capacity' => 250]);
        $r->assertStatus(201)->assertJsonPath('data.name', 'Worship & arts');
    }

    public function test_rejects_duplicate_track_name_in_conference(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $c = Conference::factory()->create();
        ConferenceTrack::factory()->create(['conference_id' => $c->id, 'name' => 'Counselling']);
        $this->postJson("/api/conferences/{$c->id}/tracks", ['name' => 'Counselling', 'capacity' => 100])
            ->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    public function test_can_update_and_delete_track(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $t = ConferenceTrack::factory()->create();
        $this->patchJson("/api/conference-tracks/{$t->id}", ['capacity' => 300])
            ->assertOk()->assertJsonPath('data.capacity', 300);
        $this->deleteJson("/api/conference-tracks/{$t->id}")->assertStatus(204);
    }
}
