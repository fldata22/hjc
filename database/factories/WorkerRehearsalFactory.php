<?php

namespace Database\Factories;

use App\Models\Crusade;
use App\Models\Zone;
use Illuminate\Database\Eloquent\Factories\Factory;

class WorkerRehearsalFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'zone_id' => Zone::factory(),
            'group' => fake()->randomElement(['choir', 'prayer', 'ushers', 'counsellors']),
            'session_number' => fake()->numberBetween(1, 7),
            'attendance_count' => fake()->numberBetween(0, 200),
        ];
    }
}
