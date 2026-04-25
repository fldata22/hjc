<?php
namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class PermitFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'name' => fake()->randomElement(['Crusade ground assembly', 'Sound clearance', 'Traffic & parking']),
            'agency' => fake()->randomElement(['Religious Affairs', 'Environmental', 'LPS']),
            'status' => fake()->randomElement(['in_review', 'approved', 'rejected']),
            'due_on' => fake()->optional()->dateTimeBetween('+1 week', '+2 months')?->format('Y-m-d'),
            'signed_on' => fake()->optional()->dateTimeBetween('-1 month', 'now')?->format('Y-m-d'),
            'notes' => null,
        ];
    }
}
