<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class ZoneFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'code' => fake()->unique()->bothify('Z##'),
            'name' => fake()->city(),
            'population' => fake()->numberBetween(20000, 80000),
            'pap' => fake()->numberBetween(15000, 70000),
        ];
    }
}
