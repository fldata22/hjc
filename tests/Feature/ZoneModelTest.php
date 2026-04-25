<?php

namespace Tests\Feature;

use App\Models\Crusade;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ZoneModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_zone_belongs_to_crusade(): void
    {
        $zone = Zone::factory()->create();
        $this->assertInstanceOf(Crusade::class, $zone->crusade);
    }

    public function test_code_is_unique_within_crusade(): void
    {
        $crusade = Crusade::factory()->create();
        Zone::factory()->create(['crusade_id' => $crusade->id, 'code' => 'Z01']);
        $this->expectException(\Illuminate\Database\QueryException::class);
        Zone::factory()->create(['crusade_id' => $crusade->id, 'code' => 'Z01']);
    }
}
