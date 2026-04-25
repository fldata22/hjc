<?php
namespace Database\Factories;

use App\Models\Conference;
use Illuminate\Database\Eloquent\Factories\Factory;

class ConferenceSessionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'conference_id' => Conference::factory(),
            'track_id' => null,
            'day_label' => fake()->randomElement(['Day 1 — Wed', 'Day 2 — Thu', 'Day 3 — Fri']),
            'name' => fake()->sentence(3),
            'speaker' => fake()->name(),
            'session_kind' => 'plenary',
            'rsvp_count' => fake()->numberBetween(50, 600),
        ];
    }
}
