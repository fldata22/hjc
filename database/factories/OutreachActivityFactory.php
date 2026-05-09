<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class OutreachActivityFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'kind' => $this->faker->randomElement(['door_to_door', 'convoy']),
            'occurred_on' => $this->faker->dateTimeBetween('-7 days', 'now')->format('Y-m-d'),
            'zone_id' => null,
            'team_lead_name' => $this->faker->name(),
            'households_reached' => $this->faker->numberBetween(20, 600),
            'conversations_count' => $this->faker->boolean(60) ? $this->faker->numberBetween(5, 100) : null,
            'pamphlets_distributed' => $this->faker->boolean(60) ? $this->faker->numberBetween(20, 500) : null,
            'route_summary' => null,
            'notes' => null,
        ];
    }
}
