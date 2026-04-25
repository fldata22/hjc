<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Reminder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReminderApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_open_reminders_by_default(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $crusade = Crusade::factory()->create();

        Reminder::factory()->create(['crusade_id' => $crusade->id, 'user_id' => $user->id]);
        Reminder::factory()->create(['crusade_id' => $crusade->id, 'user_id' => $user->id, 'completed_at' => now()]);

        $this->getJson('/api/reminders')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_can_create_reminder(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $crusade = Crusade::factory()->create();

        $this->postJson('/api/reminders', [
            'crusade_id' => $crusade->id,
            'text' => 'Send mayor letter for ZNBC TV permit',
            'due_on' => now()->toDateString(),
        ])->assertStatus(201)->assertJsonPath('data.text', 'Send mayor letter for ZNBC TV permit');
    }

    public function test_can_complete_reminder(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $r = Reminder::factory()->create(['user_id' => $user->id, 'completed_at' => null]);

        $this->patchJson("/api/reminders/{$r->id}", ['completed_at' => now()->toDateTimeString()])
            ->assertOk()
            ->assertJsonPath('data.completed_at', fn ($v) => $v !== null);
    }
}
