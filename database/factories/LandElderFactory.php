<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class LandElderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'name' => $this->faker->name('male'),
            'title' => $this->faker->randomElement(['Chief', 'Tindana', 'Naa', 'Elder', 'Wura']),
            'region' => $this->faker->randomElement(['Wa Central', 'Wa North', 'Wa South', 'Wa East', 'Wa West']),
            'phone' => $this->faker->phoneNumber(),
            'email' => null,
            'status' => $this->faker->randomElement(['identified', 'courted', 'blessed', 'neutral', 'opposed']),
            'last_contact_at' => $this->faker->boolean(60) ? $this->faker->dateTimeBetween('-30 days', 'now')->format('Y-m-d') : null,
            'notes' => null,
        ];
    }
}
