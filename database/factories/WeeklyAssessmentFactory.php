<?php
namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class WeeklyAssessmentFactory extends Factory
{
    public function definition(): array
    {
        static $week = 0;
        $week++;
        return [
            'crusade_id' => Crusade::factory(),
            'week_number' => $week,
            'prompted_at' => fake()->dateTimeThisYear(),
            'self_score' => fake()->numberBetween(1, 10),
            'notes' => fake()->paragraph(),
            'decisions_needed' => fake()->paragraph(),
            'submitted_at' => null,
        ];
    }
}
