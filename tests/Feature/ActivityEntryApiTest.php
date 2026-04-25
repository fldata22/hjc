<?php

namespace Tests\Feature;

use App\Models\ActivityEntry;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ActivityEntryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_lists_today_by_default(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $crusade = Crusade::factory()->create();

        ActivityEntry::factory()->create(['crusade_id' => $crusade->id, 'user_id' => $user->id, 'occurred_at' => now()]);
        ActivityEntry::factory()->create(['crusade_id' => $crusade->id, 'user_id' => $user->id, 'occurred_at' => now()->subDays(3)]);

        $this->getJson('/api/activity-entries?date=' . now()->toDateString())
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_filters_by_power(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $crusade = Crusade::factory()->create();

        ActivityEntry::factory()->create(['crusade_id' => $crusade->id, 'user_id' => $user->id, 'power' => 'pastors']);
        ActivityEntry::factory()->create(['crusade_id' => $crusade->id, 'user_id' => $user->id, 'power' => 'budget']);

        $this->getJson('/api/activity-entries?power=pastors')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_can_create_entry(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $crusade = Crusade::factory()->create();

        $response = $this->postJson('/api/activity-entries', [
            'crusade_id' => $crusade->id,
            'occurred_at' => '2026-04-21 11:00:00',
            'description' => 'Pledge meeting #3 · Kabwata · 62 attended',
            'power' => 'pledges',
            'status' => 'done',
        ]);
        $response->assertStatus(201)->assertJsonPath('data.power', 'pledges');
        $this->assertDatabaseHas('activity_entries', ['user_id' => $user->id, 'description' => 'Pledge meeting #3 · Kabwata · 62 attended']);
    }
}
