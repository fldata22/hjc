<?php

namespace Tests\Feature;

use App\Models\Crusade;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrusadeModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_a_crusade(): void
    {
        $crusade = Crusade::factory()->create();

        $this->assertDatabaseHas('crusades', ['id' => $crusade->id, 'city' => 'Lusaka']);
        $this->assertSame(80000.00, (float) $crusade->budget_total);
        $this->assertEquals('2026-05-02', $crusade->opens_at->toDateString());
    }
}
