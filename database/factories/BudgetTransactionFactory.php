<?php
namespace Database\Factories;

use App\Models\BudgetCategory;
use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class BudgetTransactionFactory extends Factory
{
    public function definition(): array
    {
        $kind = fake()->randomElement(['income', 'expense']);
        return [
            'crusade_id' => Crusade::factory(),
            'budget_category_id' => $kind === 'expense' ? BudgetCategory::factory() : null,
            'description' => fake()->sentence(4),
            'occurred_on' => fake()->dateTimeThisMonth()->format('Y-m-d'),
            'kind' => $kind,
            'amount' => fake()->randomFloat(2, 50, 5000),
        ];
    }
}
