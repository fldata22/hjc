<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class ChurchFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'name' => fake()->company() . ' Church',
            'zone_id' => null,
        ];
    }
}
