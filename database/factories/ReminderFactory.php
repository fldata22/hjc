<?php

namespace Database\Factories;

use App\Models\Crusade;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReminderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'user_id' => User::factory(),
            'text' => fake()->sentence(),
            'due_on' => fake()->dateTimeBetween('now', '+2 weeks')->format('Y-m-d'),
            'completed_at' => null,
        ];
    }
}
