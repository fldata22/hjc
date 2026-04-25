<?php
namespace Database\Factories;

use App\Models\Conference;
use Illuminate\Database\Eloquent\Factories\Factory;

class ConferenceTrackFactory extends Factory
{
    public function definition(): array
    {
        return [
            'conference_id' => Conference::factory(),
            'name' => fake()->unique()->randomElement(['Worship & arts', 'Pastoral leadership', 'Counselling', 'Youth & schools', 'Bishops & elders']),
            'capacity' => fake()->numberBetween(100, 250),
        ];
    }
}
