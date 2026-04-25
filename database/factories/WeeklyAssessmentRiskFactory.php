<?php
namespace Database\Factories;

use App\Models\WeeklyAssessment;
use Illuminate\Database\Eloquent\Factories\Factory;

class WeeklyAssessmentRiskFactory extends Factory
{
    public function definition(): array
    {
        return [
            'weekly_assessment_id' => WeeklyAssessment::factory(),
            'ordering' => fake()->numberBetween(1, 3),
            'severity' => fake()->randomElement(['critical', 'high', 'medium']),
            'text' => fake()->sentence(),
        ];
    }
}
