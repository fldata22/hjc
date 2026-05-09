<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\MediaMention;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MediaMentionApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_returns_mentions(): void
    {
        MediaMention::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);
        $this->getJson('/api/media-mentions')->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_can_create(): void
    {
        $this->postJson('/api/media-mentions', [
            'crusade_id' => $this->crusade->id,
            'mentioned_on' => '2026-04-15',
            'kind' => 'newspaper',
            'outlet' => 'Daily Graphic',
            'headline' => 'Crusade preparations underway in Wa',
            'sentiment' => 'positive',
        ])->assertStatus(201)
            ->assertJsonPath('data.outlet', 'Daily Graphic')
            ->assertJsonPath('data.sentiment', 'positive');
    }

    public function test_validates_kind_and_required(): void
    {
        $this->postJson('/api/media-mentions', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'totally-bogus',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['kind', 'mentioned_on', 'outlet', 'headline']);
    }

    public function test_validates_url_format(): void
    {
        $this->postJson('/api/media-mentions', [
            'crusade_id' => $this->crusade->id,
            'mentioned_on' => '2026-04-15',
            'kind' => 'online',
            'outlet' => 'Some site',
            'headline' => 'Headline',
            'url' => 'not-a-real-url',
        ])->assertStatus(422)->assertJsonValidationErrors(['url']);
    }

    public function test_can_update_and_delete(): void
    {
        $m = MediaMention::factory()->create(['crusade_id' => $this->crusade->id, 'sentiment' => 'neutral']);
        $this->patchJson("/api/media-mentions/{$m->id}", ['sentiment' => 'positive'])->assertStatus(200)->assertJsonPath('data.sentiment', 'positive');
        $this->deleteJson("/api/media-mentions/{$m->id}")->assertStatus(204);
        $this->assertDatabaseMissing('media_mentions', ['id' => $m->id]);
    }
}
