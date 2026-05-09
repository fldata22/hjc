<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\DailyProgram;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DailyProgramApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_returns_records(): void
    {
        DailyProgram::factory()->count(2)->create(['crusade_id' => $this->crusade->id]);
        $this->getJson('/api/daily-programs')->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_can_create(): void
    {
        $this->postJson('/api/daily-programs', [
            'crusade_id' => $this->crusade->id,
            'occurred_on' => '2026-04-15',
            'speaker' => 'Bishop Lovell',
            'topic' => 'The unstoppable gospel',
            'duration_minutes' => 75,
        ])->assertStatus(201)
            ->assertJsonPath('data.speaker', 'Bishop Lovell')
            ->assertJsonPath('data.duration_minutes', 75);
    }

    public function test_validates_required_and_duration_range(): void
    {
        $this->postJson('/api/daily-programs', [
            'crusade_id' => $this->crusade->id,
            'duration_minutes' => 5000,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['occurred_on', 'duration_minutes']);
    }

    public function test_can_update_and_delete(): void
    {
        $r = DailyProgram::factory()->create(['crusade_id' => $this->crusade->id, 'topic' => 'Old']);
        $this->patchJson("/api/daily-programs/{$r->id}", ['topic' => 'New'])->assertStatus(200)->assertJsonPath('data.topic', 'New');
        $this->deleteJson("/api/daily-programs/{$r->id}")->assertStatus(204);
        $this->assertDatabaseMissing('daily_programs', ['id' => $r->id]);
    }
}
