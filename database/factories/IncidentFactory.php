<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class IncidentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'kind' => $this->faker->randomElement(['security', 'medical']),
            'occurred_on' => $this->faker->dateTimeBetween('-7 days', 'now')->format('Y-m-d'),
            'occurred_at_time' => $this->faker->time('H:i'),
            'severity' => $this->faker->randomElement(['low', 'medium', 'high']),
            'location' => $this->faker->boolean(70) ? 'Section ' . $this->faker->randomLetter() : null,
            'description' => $this->faker->sentence(8),
            'response_taken' => null,
            'transported_to' => null,
            'resolution' => null,
        ];
    }
}
