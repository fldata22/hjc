<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class PublicityAssetFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'kind' => $this->faker->randomElement(['radio_spot', 'poster', 'billboard', 'social_post', 'flyer', 'banner', 'video', 'other']),
            'title' => $this->faker->sentence(4),
            'status' => $this->faker->randomElement(['planned', 'in_production', 'produced', 'deployed']),
            'produced_on' => null,
            'deployed_on' => null,
            'quantity' => $this->faker->boolean(60) ? $this->faker->numberBetween(50, 5000) : null,
            'notes' => null,
        ];
    }
}
