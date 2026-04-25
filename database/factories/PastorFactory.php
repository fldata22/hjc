<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class PastorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'full_name' => 'Pastor ' . fake()->name(),
            'church_id' => null,
            'zone_id' => null,
            'phone' => fake()->phoneNumber(),
            'email' => fake()->safeEmail(),
            'address' => fake()->address(),
            'pastor_since' => fake()->numberBetween(2000, 2024),
            'pipeline_stage' => fake()->randomElement(['identified', 'engaged', 'committed', 'active', 'champion']),
            'last_contact_at' => fake()->optional()->dateTimeThisMonth(),
        ];
    }
}
