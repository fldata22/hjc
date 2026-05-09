<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class SeatingPlanFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'estimated_capacity' => $this->faker->numberBetween(500, 10000),
            'vip_seating_count' => $this->faker->numberBetween(20, 200),
            'general_seating_count' => $this->faker->numberBetween(400, 8000),
            'counsellor_area_count' => $this->faker->numberBetween(20, 100),
            'chair_source' => $this->faker->company() . ' Rentals',
            'layout_notes' => null,
        ];
    }
}
