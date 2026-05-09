<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\PublicityAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PublicityAssetApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_returns_assets(): void
    {
        PublicityAsset::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);
        $this->getJson('/api/publicity-assets')->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_index_filters_by_status(): void
    {
        PublicityAsset::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'planned']);
        PublicityAsset::factory()->count(2)->create(['crusade_id' => $this->crusade->id, 'status' => 'deployed']);
        $this->getJson('/api/publicity-assets?status=deployed')->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_can_create(): void
    {
        $this->postJson('/api/publicity-assets', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'poster',
            'title' => 'Crusade Wa-Central A2 poster',
            'quantity' => 500,
        ])->assertStatus(201)
            ->assertJsonPath('data.title', 'Crusade Wa-Central A2 poster')
            ->assertJsonPath('data.status', 'planned')
            ->assertJsonPath('data.quantity', 500);
    }

    public function test_validates_kind_and_required(): void
    {
        $this->postJson('/api/publicity-assets', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'totally-bogus',
        ])->assertStatus(422)->assertJsonValidationErrors(['kind', 'title']);
    }

    public function test_can_update_and_delete(): void
    {
        $a = PublicityAsset::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'planned']);
        $this->patchJson("/api/publicity-assets/{$a->id}", ['status' => 'deployed'])->assertStatus(200)->assertJsonPath('data.status', 'deployed');
        $this->deleteJson("/api/publicity-assets/{$a->id}")->assertStatus(204);
        $this->assertDatabaseMissing('publicity_assets', ['id' => $a->id]);
    }
}
