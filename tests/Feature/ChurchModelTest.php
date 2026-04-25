<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Crusade;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChurchModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_church_belongs_to_crusade_and_optional_zone(): void
    {
        $crusade = Crusade::factory()->create();
        $zone = Zone::factory()->create(['crusade_id' => $crusade->id]);
        $church = Church::factory()->create(['crusade_id' => $crusade->id, 'zone_id' => $zone->id]);

        $this->assertSame($crusade->id, $church->crusade->id);
        $this->assertSame($zone->id, $church->zone->id);
    }

    public function test_zone_is_optional(): void
    {
        $church = Church::factory()->create(['zone_id' => null]);
        $this->assertNull($church->zone);
    }
}
