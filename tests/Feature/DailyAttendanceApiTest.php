<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\DailyAttendance;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DailyAttendanceApiTest extends TestCase
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
        DailyAttendance::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);

        $this->getJson('/api/daily-attendance')
            ->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_index_filters_date_range(): void
    {
        DailyAttendance::factory()->create(['crusade_id' => $this->crusade->id, 'counted_on' => '2026-04-15']);
        DailyAttendance::factory()->create(['crusade_id' => $this->crusade->id, 'counted_on' => '2026-04-20']);
        DailyAttendance::factory()->create(['crusade_id' => $this->crusade->id, 'counted_on' => '2026-05-01']);

        $this->getJson('/api/daily-attendance?date_from=2026-04-15&date_to=2026-04-25')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create(): void
    {
        $this->postJson('/api/daily-attendance', [
            'crusade_id' => $this->crusade->id,
            'counted_on' => '2026-04-15',
            'count' => 4500,
            'estimation_method' => 'head_count',
        ])->assertStatus(201)
            ->assertJsonPath('data.count', 4500)
            ->assertJsonPath('data.estimation_method', 'head_count');
    }

    public function test_validates_required(): void
    {
        $this->postJson('/api/daily-attendance', [
            'crusade_id' => $this->crusade->id,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['counted_on', 'count']);
    }

    public function test_validates_negative_count(): void
    {
        $this->postJson('/api/daily-attendance', [
            'crusade_id' => $this->crusade->id,
            'counted_on' => '2026-04-15',
            'count' => -10,
        ])->assertStatus(422)->assertJsonValidationErrors(['count']);
    }

    public function test_can_update_and_delete(): void
    {
        $r = DailyAttendance::factory()->create(['crusade_id' => $this->crusade->id, 'count' => 100]);

        $this->patchJson("/api/daily-attendance/{$r->id}", ['count' => 200])
            ->assertStatus(200)->assertJsonPath('data.count', 200);

        $this->deleteJson("/api/daily-attendance/{$r->id}")->assertStatus(204);
        $this->assertDatabaseMissing('daily_attendance', ['id' => $r->id]);
    }
}
