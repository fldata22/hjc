<?php
namespace Tests\Feature;

use App\Models\Conference;
use App\Models\ConferenceRegistration;
use App\Models\ConferenceSession;
use App\Models\ConferenceTrack;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConferenceSubModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_session_belongs_to_conference_and_optional_track(): void
    {
        $c = Conference::factory()->create();
        $t = ConferenceTrack::factory()->create(['conference_id' => $c->id]);
        $s = ConferenceSession::factory()->create(['conference_id' => $c->id, 'track_id' => $t->id, 'session_kind' => 'track']);
        $this->assertSame($c->id, $s->conference->id);
        $this->assertSame($t->id, $s->track->id);
    }

    public function test_registration_relations_work(): void
    {
        $r = ConferenceRegistration::factory()->create(['paid_in_full' => true, 'paid_amount' => 40]);
        $this->assertNotNull($r->conference);
        $this->assertNotNull($r->pastor);
        $this->assertTrue($r->paid_in_full);
    }
}
