<?php
namespace Database\Factories;

use App\Models\Power;
use App\Models\WeeklyAssessment;
use Illuminate\Database\Eloquent\Factories\Factory;

class WeeklyAssessmentReadingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'weekly_assessment_id' => WeeklyAssessment::factory(),
            'power_id' => Power::inRandomOrder()->first()?->id ?? Power::factory(),
            'value_pct' => fake()->numberBetween(0, 100),
        ];
    }
}
