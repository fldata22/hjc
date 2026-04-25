<?php
namespace Tests\Feature;

use App\Models\BudgetCategory;
use App\Models\BudgetTransaction;
use App\Models\Crusade;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BudgetCategoryApiTest extends TestCase
{
    use RefreshDatabase;

    private Crusade $crusade;
    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->crusade = Crusade::factory()->create();
    }

    public function test_index_returns_categories_with_spent_and_pct(): void
    {
        $cat = BudgetCategory::factory()->create([
            'crusade_id' => $this->crusade->id,
            'name' => 'Publicity', 'allocated_amount' => 16000,
        ]);
        BudgetTransaction::factory()->create([
            'crusade_id' => $this->crusade->id, 'budget_category_id' => $cat->id,
            'kind' => 'expense', 'amount' => 12400,
        ]);

        $r = $this->getJson('/api/budget-categories');
        $r->assertOk()->assertJsonCount(1, 'data');
        $row = $r->json('data.0');
        $this->assertSame('Publicity', $row['name']);
        $this->assertSame('12400.00', $row['spent']);
        $this->assertSame('77.50', $row['pct_spent']);
    }

    public function test_can_create_category(): void
    {
        $r = $this->postJson('/api/budget-categories', [
            'crusade_id' => $this->crusade->id,
            'name' => 'Hospitality', 'allocated_amount' => 7000, 'order_index' => 6,
        ]);
        $r->assertStatus(201)->assertJsonPath('data.name', 'Hospitality');
    }

    public function test_can_update_and_delete(): void
    {
        $c = BudgetCategory::factory()->create(['crusade_id' => $this->crusade->id]);
        $this->patchJson("/api/budget-categories/{$c->id}", ['allocated_amount' => 9000])
            ->assertOk()->assertJsonPath('data.allocated_amount', '9000.00');
        $this->deleteJson("/api/budget-categories/{$c->id}")->assertStatus(204);
    }
}
