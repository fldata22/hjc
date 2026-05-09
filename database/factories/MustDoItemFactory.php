<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class MustDoItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'area' => $this->faker->randomElement(['venue', 'publicity', 'permits', 'logistics', 'other']),
            'title' => $this->faker->sentence(4),
            'owner_name' => $this->faker->boolean(70) ? $this->faker->name() : null,
            'due_date' => $this->faker->boolean(70) ? $this->faker->dateTimeBetween('+1 day', '+60 days')->format('Y-m-d') : null,
            'status' => $this->faker->randomElement(['pending', 'in_progress', 'done']),
            'notes' => null,
        ];
    }
}
