<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class PowerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->slug(2),
            'name' => fake()->words(2, true),
            'order_index' => fake()->numberBetween(1, 14),
            'description' => fake()->sentence(),
        ];
    }
}
