<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\MustDoItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MustDoItemApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_returns_items(): void
    {
        MustDoItem::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);

        $this->getJson('/api/must-do-items')
            ->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_index_filters_by_status(): void
    {
        MustDoItem::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'pending']);
        MustDoItem::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'done']);
        MustDoItem::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'done']);

        $this->getJson('/api/must-do-items?status=done')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_item(): void
    {
        $this->postJson('/api/must-do-items', [
            'crusade_id' => $this->crusade->id,
            'area' => 'venue',
            'title' => 'Confirm sound provider',
            'due_date' => '2026-05-15',
        ])->assertStatus(201)
            ->assertJsonPath('data.title', 'Confirm sound provider')
            ->assertJsonPath('data.area', 'venue')
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_create_validates_area_enum(): void
    {
        $this->postJson('/api/must-do-items', [
            'crusade_id' => $this->crusade->id,
            'area' => 'totally-bogus',
            'title' => 'X',
        ])->assertStatus(422)->assertJsonValidationErrors(['area']);
    }

    public function test_create_validates_required_fields(): void
    {
        $this->postJson('/api/must-do-items', [
            'crusade_id' => $this->crusade->id,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['area', 'title']);
    }

    public function test_can_update_status(): void
    {
        $i = MustDoItem::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'pending']);

        $this->patchJson("/api/must-do-items/{$i->id}", ['status' => 'done'])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'done');
    }

    public function test_update_validates_status_enum(): void
    {
        $i = MustDoItem::factory()->create(['crusade_id' => $this->crusade->id]);

        $this->patchJson("/api/must-do-items/{$i->id}", ['status' => 'totally-bogus'])
            ->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    public function test_can_delete_item(): void
    {
        $i = MustDoItem::factory()->create(['crusade_id' => $this->crusade->id]);

        $this->deleteJson("/api/must-do-items/{$i->id}")->assertStatus(204);
        $this->assertDatabaseMissing('must_do_items', ['id' => $i->id]);
    }
}
