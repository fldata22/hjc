<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Donor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DonorApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_returns_donors(): void
    {
        Donor::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);
        $this->getJson('/api/donors')->assertStatus(200)->assertJsonCount(3, 'data');
    }

    public function test_index_returns_pledge_totals(): void
    {
        Donor::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'committed', 'pledge_amount' => 1000]);
        Donor::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'given', 'pledge_amount' => 2500]);
        Donor::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'prospect', 'pledge_amount' => 500]);

        $this->getJson('/api/donors')
            ->assertStatus(200)
            ->assertJsonPath('meta.totals.pledged', '3500.00')
            ->assertJsonPath('meta.totals.given', '2500.00');
    }

    public function test_can_create(): void
    {
        $this->postJson('/api/donors', [
            'crusade_id' => $this->crusade->id,
            'name' => 'Hon. Sarah Mensah',
            'kind' => 'individual',
            'pledge_amount' => 5000,
        ])->assertStatus(201)
            ->assertJsonPath('data.name', 'Hon. Sarah Mensah')
            ->assertJsonPath('data.status', 'prospect');
    }

    public function test_validates_kind_and_required(): void
    {
        $this->postJson('/api/donors', [
            'crusade_id' => $this->crusade->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['name', 'kind']);
    }

    public function test_can_update_and_delete(): void
    {
        $d = Donor::factory()->create(['crusade_id' => $this->crusade->id, 'status' => 'engaged']);
        $this->patchJson("/api/donors/{$d->id}", ['status' => 'given'])->assertStatus(200)->assertJsonPath('data.status', 'given');
        $this->deleteJson("/api/donors/{$d->id}")->assertStatus(204);
        $this->assertDatabaseMissing('donors', ['id' => $d->id]);
    }
}
