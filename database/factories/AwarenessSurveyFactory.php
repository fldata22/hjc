<?php

namespace Database\Factories;

use App\Models\Crusade;
use App\Models\Zone;
use Illuminate\Database\Eloquent\Factories\Factory;

class AwarenessSurveyFactory extends Factory
{
    public function definition(): array
    {
        $surveyed = fake()->numberBetween(50, 200);
        return [
            'crusade_id' => Crusade::factory(),
            'zone_id' => Zone::factory(),
            'survey_number' => fake()->numberBetween(1, 6),
            'surveyed_count' => $surveyed,
            'attending_yes_count' => fake()->numberBetween(0, $surveyed),
            'taken_on' => fake()->dateTimeThisYear()->format('Y-m-d'),
        ];
    }
}
