<?php
namespace Tests\Feature;

use App\Models\BudgetCategory;
use App\Models\BudgetTransaction;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BudgetSummaryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_summary_returns_totals(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $crusade = Crusade::factory()->create(['budget_total' => 80000]);
        $cat = BudgetCategory::factory()->create(['crusade_id' => $crusade->id, 'allocated_amount' => 18000]);

        BudgetTransaction::factory()->create([
            'crusade_id' => $crusade->id, 'kind' => 'income', 'amount' => 62500, 'budget_category_id' => null,
        ]);
        BudgetTransaction::factory()->create([
            'crusade_id' => $crusade->id, 'kind' => 'expense', 'amount' => 11200, 'budget_category_id' => $cat->id,
        ]);

        $r = $this->getJson('/api/budget/summary');
        $r->assertOk()
          ->assertJsonPath('data.total_budget', '80000.00')
          ->assertJsonPath('data.income', '62500.00')
          ->assertJsonPath('data.spent', '11200.00')
          ->assertJsonPath('data.gap_to_target', '17500.00');

        $cats = collect($r->json('data.categories'));
        $this->assertCount(1, $cats);
        $this->assertSame('11200.00', $cats[0]['spent']);
    }
}
