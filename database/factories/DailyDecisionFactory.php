<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class DailyDecisionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'decided_on' => $this->faker->dateTimeBetween('-7 days', 'now')->format('Y-m-d'),
            'salvations' => $this->faker->numberBetween(0, 500),
            'rededications' => $this->faker->numberBetween(0, 200),
            'healings' => $this->faker->numberBetween(0, 50),
            'counselled' => $this->faker->numberBetween(0, 600),
            'notes' => null,
        ];
    }
}
