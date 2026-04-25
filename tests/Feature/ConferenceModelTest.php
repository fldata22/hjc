<?php
namespace Tests\Feature;

use App\Models\Conference;
use App\Models\ConferenceTrack;
use App\Models\Crusade;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConferenceModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_conference_has_tracks(): void
    {
        $c = Conference::factory()->create();
        ConferenceTrack::factory()->count(3)->create(['conference_id' => $c->id]);
        $this->assertCount(3, $c->fresh()->tracks);
    }

    public function test_track_name_unique_per_conference(): void
    {
        $c = Conference::factory()->create();
        ConferenceTrack::factory()->create(['conference_id' => $c->id, 'name' => 'Worship & arts']);
        $this->expectException(\Illuminate\Database\QueryException::class);
        ConferenceTrack::factory()->create(['conference_id' => $c->id, 'name' => 'Worship & arts']);
    }
}
