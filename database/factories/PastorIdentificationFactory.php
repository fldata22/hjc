<?php

namespace Database\Factories;

use App\Models\Pastor;
use Illuminate\Database\Eloquent\Factories\Factory;

class PastorIdentificationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'pastor_id' => Pastor::factory(),
            'category' => fake()->randomElement(['PCM', 'BOT']),
            'sub_role' => fake()->randomElement(['primary', 'member', 'chair', 'sec']),
            'assigned_at' => fake()->dateTimeThisYear(),
            'assigned_by_user_id' => null,
        ];
    }
}
