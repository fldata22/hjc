<?php
namespace Tests\Feature;

use App\Models\BudgetCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetCategoryModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_category(): void
    {
        $c = BudgetCategory::factory()->create(['allocated_amount' => 18000]);
        $this->assertSame('18000.00', (string) $c->allocated_amount);
    }
}
