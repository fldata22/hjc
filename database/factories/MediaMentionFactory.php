<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class MediaMentionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'mentioned_on' => $this->faker->dateTimeBetween('-30 days', 'now')->format('Y-m-d'),
            'kind' => $this->faker->randomElement(['newspaper', 'radio', 'tv', 'online', 'social', 'other']),
            'outlet' => $this->faker->company(),
            'headline' => $this->faker->sentence(8),
            'url' => $this->faker->boolean(50) ? $this->faker->url() : null,
            'sentiment' => $this->faker->randomElement(['positive', 'neutral', 'negative', null]),
            'summary' => null,
        ];
    }
}
