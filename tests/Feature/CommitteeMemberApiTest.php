<?php

namespace Tests\Feature;

use App\Models\CommitteeMember;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommitteeMemberApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_all_members(): void
    {
        CommitteeMember::factory()->count(2)->bot()->create(['crusade_id' => $this->crusade->id]);
        CommitteeMember::factory()->count(3)->cpc()->create(['crusade_id' => $this->crusade->id]);

        $this->getJson('/api/committee-members')->assertOk()->assertJsonCount(5, 'data');
    }

    public function test_filters_by_kind(): void
    {
        CommitteeMember::factory()->count(2)->bot()->create(['crusade_id' => $this->crusade->id]);
        CommitteeMember::factory()->count(3)->cpc()->create(['crusade_id' => $this->crusade->id]);

        $this->getJson('/api/committee-members?kind=bot')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/committee-members?kind=cpc')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_index_orders_by_name(): void
    {
        CommitteeMember::factory()->bot()->create(['crusade_id' => $this->crusade->id, 'name' => 'Charlie']);
        CommitteeMember::factory()->bot()->create(['crusade_id' => $this->crusade->id, 'name' => 'Alice']);
        CommitteeMember::factory()->bot()->create(['crusade_id' => $this->crusade->id, 'name' => 'Bob']);

        $names = collect($this->getJson('/api/committee-members')->json('data'))->pluck('name')->toArray();
        $this->assertSame(['Alice', 'Bob', 'Charlie'], $names);
    }

    public function test_creates_bot_member(): void
    {
        $response = $this->postJson('/api/committee-members', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'bot',
            'name' => 'Rev. Edmund Asare',
            'role' => 'Chair',
            'org' => 'Wa Council of Churches',
            'phone' => '+233 24 555 0100',
            'email' => 'edmund@example.com',
            'status' => 'confirmed',
            'notes' => null,
        ]);
        $response->assertStatus(201)
            ->assertJsonPath('data.kind', 'bot')
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.name', 'Rev. Edmund Asare');
    }

    public function test_creates_cpc_member(): void
    {
        $response = $this->postJson('/api/committee-members', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'cpc',
            'name' => 'Akua Boateng',
            'role' => 'Zone Coordinator',
            'org' => 'Wa Central',
            'phone' => '+233 24 555 0301',
            'email' => null,
            'status' => 'active',
            'notes' => null,
        ]);
        $response->assertStatus(201)
            ->assertJsonPath('data.kind', 'cpc')
            ->assertJsonPath('data.status', 'active');
    }

    public function test_create_rejects_unknown_kind(): void
    {
        $response = $this->postJson('/api/committee-members', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'other',
            'name' => 'X', 'role' => 'Y', 'status' => 'confirmed',
        ])->assertStatus(422)->assertJsonValidationErrors(['kind']);

        // Should NOT report a misleading status error when kind is the actual problem.
        $errors = $response->json('errors');
        $this->assertArrayNotHasKey('status', $errors, 'unknown kind should not also produce a status error');
    }

    public function test_create_rejects_status_not_in_kind_enum(): void
    {
        // BOT can't have CPC status 'active'
        $this->postJson('/api/committee-members', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'bot',
            'name' => 'X', 'role' => 'Y', 'status' => 'active',
        ])->assertStatus(422)->assertJsonValidationErrors(['status']);

        // CPC can't have BOT status 'confirmed'
        $this->postJson('/api/committee-members', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'cpc',
            'name' => 'X', 'role' => 'Y', 'status' => 'confirmed',
        ])->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    public function test_create_requires_name_role_status_kind(): void
    {
        $this->postJson('/api/committee-members', [
            'crusade_id' => $this->crusade->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['kind', 'name', 'role', 'status']);
    }

    public function test_create_requires_valid_email(): void
    {
        $this->postJson('/api/committee-members', [
            'crusade_id' => $this->crusade->id,
            'kind' => 'bot',
            'name' => 'X', 'role' => 'Y', 'status' => 'confirmed',
            'email' => 'not-an-email',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_can_update_status(): void
    {
        $member = CommitteeMember::factory()->bot()->create([
            'crusade_id' => $this->crusade->id, 'status' => 'pending',
        ]);
        $this->patchJson("/api/committee-members/{$member->id}", ['status' => 'confirmed'])
            ->assertOk()->assertJsonPath('data.status', 'confirmed');
    }

    public function test_update_rejects_status_not_in_record_kind_enum(): void
    {
        $member = CommitteeMember::factory()->bot()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/committee-members/{$member->id}", ['status' => 'active'])
            ->assertStatus(422)->assertJsonValidationErrors(['status']);
    }

    public function test_can_delete(): void
    {
        $member = CommitteeMember::factory()->bot()->create(['crusade_id' => $this->crusade->id]);
        $this->deleteJson("/api/committee-members/{$member->id}")->assertNoContent();
        $this->assertDatabaseMissing('committee_members', ['id' => $member->id]);
    }
}
