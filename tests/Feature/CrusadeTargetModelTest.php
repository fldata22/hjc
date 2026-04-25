<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\CrusadeTarget;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrusadeTargetModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_one_target_per_resource_per_crusade(): void
    {
        $crusade = Crusade::factory()->create();
        CrusadeTarget::factory()->create(['crusade_id' => $crusade->id, 'resource' => 'choir', 'target_quantity' => 150]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        CrusadeTarget::factory()->create(['crusade_id' => $crusade->id, 'resource' => 'choir', 'target_quantity' => 200]);
    }
}
