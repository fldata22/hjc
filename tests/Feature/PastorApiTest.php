<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Pastor;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PastorApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_lists_pastors_paginated(): void
    {
        Pastor::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);
        $this->getJson('/api/pastors')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'total']])
            ->assertJsonCount(3, 'data');
    }

    public function test_index_filters_by_pipeline_stage(): void
    {
        Pastor::factory()->create(['crusade_id' => $this->crusade->id, 'pipeline_stage' => 'active']);
        Pastor::factory()->create(['crusade_id' => $this->crusade->id, 'pipeline_stage' => 'identified']);

        $this->getJson('/api/pastors?pipeline_stage=active')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_index_filters_by_zone(): void
    {
        $z1 = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        $z2 = Zone::factory()->create(['crusade_id' => $this->crusade->id]);
        Pastor::factory()->create(['crusade_id' => $this->crusade->id, 'zone_id' => $z1->id]);
        Pastor::factory()->create(['crusade_id' => $this->crusade->id, 'zone_id' => $z2->id]);

        $this->getJson("/api/pastors?zone_id={$z1->id}")->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_index_searches_by_name(): void
    {
        Pastor::factory()->create(['crusade_id' => $this->crusade->id, 'full_name' => 'Pastor Emmanuel Mwanza']);
        Pastor::factory()->create(['crusade_id' => $this->crusade->id, 'full_name' => 'Rev. Joyce Kalonga']);

        $this->getJson('/api/pastors?q=mwanza')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_show_includes_identifications_and_pledge_totals(): void
    {
        $pastor = Pastor::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->getJson("/api/pastors/{$pastor->id}")
            ->assertOk()
            ->assertJsonStructure(['data' => ['id', 'full_name', 'identifications', 'pledge_totals']]);
    }

    public function test_create_validates_required_fields(): void
    {
        $this->postJson('/api/pastors', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['full_name', 'crusade_id']);
    }

    public function test_can_create_pastor(): void
    {
        $response = $this->postJson('/api/pastors', [
            'crusade_id' => $this->crusade->id,
            'full_name' => 'Pastor Mary Nkomo',
            'pipeline_stage' => 'engaged',
        ]);
        $response->assertStatus(201)->assertJsonPath('data.full_name', 'Pastor Mary Nkomo');
    }

    public function test_can_update_pastor(): void
    {
        $pastor = Pastor::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/pastors/{$pastor->id}", ['pipeline_stage' => 'champion'])
            ->assertOk()
            ->assertJsonPath('data.pipeline_stage', 'champion');
    }

    public function test_can_soft_delete_pastor(): void
    {
        $pastor = Pastor::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->deleteJson("/api/pastors/{$pastor->id}")->assertStatus(204);
        $this->assertSoftDeleted($pastor);
    }

    public function test_stage_counts_endpoint(): void
    {
        Pastor::factory()->count(3)->create(['crusade_id' => $this->crusade->id, 'pipeline_stage' => 'identified']);
        Pastor::factory()->count(2)->create(['crusade_id' => $this->crusade->id, 'pipeline_stage' => 'engaged']);
        Pastor::factory()->create(['crusade_id' => $this->crusade->id, 'pipeline_stage' => 'champion']);

        $r = $this->getJson('/api/pastors/stage-counts');
        $r->assertOk()
          ->assertJsonPath('data.identified', 3)
          ->assertJsonPath('data.engaged', 2)
          ->assertJsonPath('data.committed', 0)
          ->assertJsonPath('data.active', 0)
          ->assertJsonPath('data.champion', 1)
          ->assertJsonPath('data.total', 6);
    }
}
