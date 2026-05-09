<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\User;
use App\Models\Worker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkerApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_returns_workers(): void
    {
        Worker::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);

        $this->getJson('/api/workers')
            ->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_index_filters_by_group_type(): void
    {
        Worker::factory()->create(['crusade_id' => $this->crusade->id, 'group_type' => 'choir']);
        Worker::factory()->count(2)->create(['crusade_id' => $this->crusade->id, 'group_type' => 'ushers']);

        $this->getJson('/api/workers?group_type=choir')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/workers?group_type=ushers')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_worker(): void
    {
        $this->postJson('/api/workers', [
            'crusade_id' => $this->crusade->id,
            'group_type' => 'choir',
            'name' => 'Sister Akua',
            'role' => 'Lead alto',
            'phone' => '+233 24 555 0000',
        ])->assertStatus(201)
            ->assertJsonPath('data.name', 'Sister Akua')
            ->assertJsonPath('data.group_type', 'choir')
            ->assertJsonPath('data.status', 'active');
    }

    public function test_create_validates_group_type_enum(): void
    {
        $this->postJson('/api/workers', [
            'crusade_id' => $this->crusade->id,
            'group_type' => 'totally-bogus',
            'name' => 'X',
        ])->assertStatus(422)->assertJsonValidationErrors(['group_type']);
    }

    public function test_create_validates_required_fields(): void
    {
        $this->postJson('/api/workers', [
            'crusade_id' => $this->crusade->id,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['group_type', 'name']);
    }

    public function test_can_update_worker(): void
    {
        $w = Worker::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'active']);

        $this->patchJson("/api/workers/{$w->id}", ['status' => 'inactive', 'role' => 'Section captain'])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'inactive')
            ->assertJsonPath('data.role', 'Section captain');
    }

    public function test_update_validates_status_enum(): void
    {
        $w = Worker::factory()->create(['crusade_id' => $this->crusade->id]);

        $this->patchJson("/api/workers/{$w->id}", ['status' => 'totally-bogus'])
            ->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    public function test_can_delete_worker(): void
    {
        $w = Worker::factory()->create(['crusade_id' => $this->crusade->id]);

        $this->deleteJson("/api/workers/{$w->id}")->assertStatus(204);
        $this->assertDatabaseMissing('workers', ['id' => $w->id]);
    }
}
