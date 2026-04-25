<?php
namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class StakeholderFactory extends Factory
{
    public function definition(): array
    {
        $stage = fake()->numberBetween(1, 4);
        $labels = [1 => 'identified', 2 => 'engaged', 3 => 'committed', 4 => 'won'];
        return [
            'crusade_id' => Crusade::factory(),
            'name' => fake()->name(),
            'org' => fake()->company(),
            'role' => fake()->randomElement(['Mayor', 'Imam', 'Bishop', 'Permitting', 'Chief', 'Security']),
            'pipeline_stage' => $stage,
            'status_label' => $labels[$stage],
            'last_contact_at' => fake()->optional()->dateTimeThisMonth(),
            'notes' => null,
        ];
    }
}
