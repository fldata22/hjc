<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class DailyProgramFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'occurred_on' => $this->faker->dateTimeBetween('-7 days', 'now')->format('Y-m-d'),
            'speaker' => $this->faker->name(),
            'topic' => $this->faker->sentence(4),
            'duration_minutes' => $this->faker->numberBetween(30, 180),
            'key_moments' => null,
            'narrative' => null,
        ];
    }
}
