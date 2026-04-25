<?php
namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class BudgetCategoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'name' => fake()->randomElement(['Crusade ground', 'Publicity', 'Conference', 'Worker training']),
            'allocated_amount' => fake()->randomFloat(2, 1000, 20000),
            'order_index' => fake()->numberBetween(1, 8),
        ];
    }
}
