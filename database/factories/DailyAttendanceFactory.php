<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class DailyAttendanceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'counted_on' => $this->faker->dateTimeBetween('-7 days', 'now')->format('Y-m-d'),
            'count' => $this->faker->numberBetween(500, 8000),
            'estimation_method' => $this->faker->randomElement(['head_count', 'aerial_estimate', 'turnstile', 'usher_tally', null]),
            'notes' => null,
        ];
    }
}
