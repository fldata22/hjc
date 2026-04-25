<?php
namespace Tests\Feature;

use App\Models\Conference;
use App\Models\ConferenceRegistration;
use App\Models\ConferenceSession;
use App\Models\ConferenceTrack;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConferenceApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_conferences(): void
    {
        Conference::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->getJson('/api/conferences')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_can_create_conference(): void
    {
        $r = $this->postJson('/api/conferences', [
            'crusade_id' => $this->crusade->id,
            'name' => 'HJC 2026',
            'starts_on' => '2026-04-30',
            'ends_on' => '2026-05-02',
            'capacity' => 820,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.capacity', 820);
    }

    public function test_registration_summary(): void
    {
        $c = Conference::factory()->create(['crusade_id' => $this->crusade->id, 'capacity' => 820]);
        $t1 = ConferenceTrack::factory()->create(['conference_id' => $c->id, 'name' => 'Worship & arts', 'capacity' => 250]);
        $t2 = ConferenceTrack::factory()->create(['conference_id' => $c->id, 'name' => 'Counselling', 'capacity' => 150]);

        ConferenceSession::factory()->count(5)->create(['conference_id' => $c->id, 'session_kind' => 'plenary']);
        ConferenceSession::factory()->count(3)->create(['conference_id' => $c->id, 'session_kind' => 'track', 'track_id' => $t1->id]);

        ConferenceRegistration::factory()->create(['conference_id' => $c->id, 'track_id' => $t1->id, 'paid_in_full' => true, 'paid_amount' => 40]);
        ConferenceRegistration::factory()->create(['conference_id' => $c->id, 'track_id' => $t1->id, 'paid_in_full' => true, 'paid_amount' => 40]);
        ConferenceRegistration::factory()->create(['conference_id' => $c->id, 'track_id' => $t2->id, 'paid_in_full' => true, 'paid_amount' => 40]);
        ConferenceRegistration::factory()->create(['conference_id' => $c->id, 'track_id' => $t2->id, 'paid_in_full' => false, 'paid_amount' => 0]);

        $r = $this->getJson("/api/conferences/{$c->id}/registration-summary");
        $r->assertOk()
          ->assertJsonPath('data.registered', 4)
          ->assertJsonPath('data.paid_in_full', 3)
          ->assertJsonPath('data.sum_paid_amount', '120.00')
          ->assertJsonPath('data.sessions.plenary', 5)
          ->assertJsonPath('data.sessions.track', 3);

        $tracks = collect($r->json('data.tracks'));
        $worship = $tracks->firstWhere('name', 'Worship & arts');
        $this->assertSame(2, $worship['registered']);
        $this->assertSame(250, $worship['capacity']);
    }

    public function test_can_update_and_delete(): void
    {
        $c = Conference::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/conferences/{$c->id}", ['capacity' => 1000])
            ->assertOk()->assertJsonPath('data.capacity', 1000);
        $this->deleteJson("/api/conferences/{$c->id}")->assertStatus(204);
    }
}
