<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\LandElder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LandElderApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_filters_by_status(): void
    {
        LandElder::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'identified']);
        LandElder::factory()->count(2)->create(['crusade_id' => $this->crusade->id, 'status' => 'blessed']);

        $this->getJson('/api/land-elders?status=blessed')->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_can_create(): void
    {
        $this->postJson('/api/land-elders', [
            'crusade_id' => $this->crusade->id,
            'name' => 'Naa Yagbon-Wura',
            'title' => 'Naa',
            'region' => 'Wa Central',
        ])->assertStatus(201)
            ->assertJsonPath('data.name', 'Naa Yagbon-Wura')
            ->assertJsonPath('data.status', 'identified');
    }

    public function test_validates_required(): void
    {
        $this->postJson('/api/land-elders', [
            'crusade_id' => $this->crusade->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    public function test_validates_status_enum(): void
    {
        $this->postJson('/api/land-elders', [
            'crusade_id' => $this->crusade->id,
            'name' => 'Test',
            'status' => 'totally-bogus',
        ])->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    public function test_can_update_and_delete(): void
    {
        $e = LandElder::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'identified']);
        $this->patchJson("/api/land-elders/{$e->id}", ['status' => 'blessed'])->assertStatus(200)->assertJsonPath('data.status', 'blessed');
        $this->deleteJson("/api/land-elders/{$e->id}")->assertStatus(204);
        $this->assertDatabaseMissing('land_elders', ['id' => $e->id]);
    }
}
