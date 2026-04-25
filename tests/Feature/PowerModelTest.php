<?php

namespace Tests\Feature;

use App\Models\Power;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PowerModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_seeds_14_powers(): void
    {
        $this->assertSame(14, Power::count());
        $this->assertNotNull(Power::where('code', 'awareness')->first());
        $this->assertNotNull(Power::where('code', 'volunteers')->first());
    }

    public function test_powers_have_unique_codes(): void
    {
        $duplicate = ['code' => 'awareness', 'name' => 'Dup', 'order_index' => 99];
        $this->expectException(\Illuminate\Database\QueryException::class);
        Power::create($duplicate);
    }

    public function test_powers_are_ordered_by_index(): void
    {
        $first = Power::orderBy('order_index')->first();
        $this->assertSame('pastors', $first->code);
    }
}
