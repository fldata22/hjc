<?php

namespace Database\Factories;

use App\Models\Crusade;
use App\Models\Power;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ActivityEntryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'user_id' => User::factory(),
            'occurred_at' => fake()->dateTimeThisMonth(),
            'description' => fake()->sentence(),
            'power_id' => Power::inRandomOrder()->first()?->id ?? Power::factory(),
            'status' => 'done',
        ];
    }
}
