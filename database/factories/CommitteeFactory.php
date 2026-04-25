<?php
namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class CommitteeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'name' => fake()->randomElement(['Steering', 'Finance', 'Logistics', 'Counselling']),
            'chair_name' => fake()->name(),
            'focus_area' => fake()->randomElement(['publicity', 'finance', 'logistics']),
            'status' => fake()->randomElement(['on_track', 'watch', 'at_risk']),
            'deliverables_done_pct' => fake()->numberBetween(0, 100),
            'member_count' => fake()->numberBetween(3, 12),
            'next_meeting_on' => fake()->dateTimeBetween('now', '+2 weeks')->format('Y-m-d'),
        ];
    }
}
