<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class CommitteeMemberFactory extends Factory
{
    public function definition(): array
    {
        $kind = fake()->randomElement(['bot', 'cpc']);
        $statuses = $kind === 'bot'
            ? ['confirmed', 'pending', 'declined']
            : ['active', 'on-leave', 'stepped-down'];

        return [
            'crusade_id' => Crusade::factory(),
            'kind' => $kind,
            'name' => fake()->name(),
            'role' => fake()->jobTitle(),
            'org' => fake()->company(),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->safeEmail(),
            'status' => fake()->randomElement($statuses),
            'notes' => null,
        ];
    }

    public function bot(): static
    {
        return $this->state(fn () => [
            'kind' => 'bot',
            'status' => fake()->randomElement(['confirmed', 'pending', 'declined']),
        ]);
    }

    public function cpc(): static
    {
        return $this->state(fn () => [
            'kind' => 'cpc',
            'status' => fake()->randomElement(['active', 'on-leave', 'stepped-down']),
        ]);
    }
}
