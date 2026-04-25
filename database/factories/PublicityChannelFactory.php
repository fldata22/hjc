<?php
namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class PublicityChannelFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'name' => fake()->company() . ' FM',
            'channel_type' => fake()->randomElement(['radio', 'print', 'ooh', 'sms', 'tv']),
            'reach_estimate' => fake()->numberBetween(50, 999) . 'k reach',
            'notes' => fake()->sentence(),
            'status' => fake()->randomElement(['live', 'in_progress', 'scheduled', 'blocked']),
            'spend_to_date' => fake()->randomFloat(2, 0, 5000),
        ];
    }
}
