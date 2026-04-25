<?php
namespace Tests\Feature;

use App\Models\BudgetCategory;
use App\Models\BudgetTransaction;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BudgetTransactionApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_lists_transactions_paginated(): void
    {
        BudgetTransaction::factory()->count(3)->create(['crusade_id' => $this->crusade->id]);
        $this->getJson('/api/budget-transactions')->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'total']])
            ->assertJsonCount(3, 'data');
    }

    public function test_filters_by_kind(): void
    {
        BudgetTransaction::factory()->create(['crusade_id' => $this->crusade->id, 'kind' => 'income']);
        BudgetTransaction::factory()->create(['crusade_id' => $this->crusade->id, 'kind' => 'expense']);
        $this->getJson('/api/budget-transactions?kind=income')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_filters_by_category_and_date_range(): void
    {
        $cat = BudgetCategory::factory()->create(['crusade_id' => $this->crusade->id]);
        BudgetTransaction::factory()->create([
            'crusade_id' => $this->crusade->id, 'budget_category_id' => $cat->id,
            'kind' => 'expense', 'occurred_on' => '2026-04-15',
        ]);
        BudgetTransaction::factory()->create([
            'crusade_id' => $this->crusade->id, 'budget_category_id' => $cat->id,
            'kind' => 'expense', 'occurred_on' => '2026-03-01',
        ]);
        $this->getJson("/api/budget-transactions?category_id={$cat->id}&date_from=2026-04-01")
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_can_create_income(): void
    {
        $r = $this->postJson('/api/budget-transactions', [
            'crusade_id' => $this->crusade->id,
            'description' => 'Donation · Faith Trust', 'occurred_on' => '2026-04-12',
            'kind' => 'income', 'amount' => 5000,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.kind', 'income');
    }

    public function test_can_create_expense_with_category(): void
    {
        $cat = BudgetCategory::factory()->create(['crusade_id' => $this->crusade->id]);
        $r = $this->postJson('/api/budget-transactions', [
            'crusade_id' => $this->crusade->id,
            'budget_category_id' => $cat->id,
            'description' => 'Phoenix FM · radio buy day 1', 'occurred_on' => '2026-04-15',
            'kind' => 'expense', 'amount' => 1800,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.budget_category_id', $cat->id);
    }

    public function test_validates_amount_positive(): void
    {
        $this->postJson('/api/budget-transactions', [
            'crusade_id' => $this->crusade->id,
            'description' => 'X', 'occurred_on' => '2026-04-12',
            'kind' => 'income', 'amount' => -100,
        ])->assertStatus(422)->assertJsonValidationErrors(['amount']);
    }

    public function test_can_update_and_delete(): void
    {
        $t = BudgetTransaction::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/budget-transactions/{$t->id}", ['amount' => 999])
            ->assertOk()->assertJsonPath('data.amount', '999.00');
        $this->deleteJson("/api/budget-transactions/{$t->id}")->assertStatus(204);
    }
}
