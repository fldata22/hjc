<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class WorkerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'group_type' => $this->faker->randomElement([
                'choir', 'ushers', 'security', 'counsellors', 'prayer_warriors',
                'hospitality', 'technical', 'medical', 'childrens', 'general',
            ]),
            'name' => $this->faker->name(),
            'role' => $this->faker->boolean(60) ? $this->faker->jobTitle() : null,
            'phone' => $this->faker->phoneNumber(),
            'email' => $this->faker->boolean(40) ? $this->faker->safeEmail() : null,
            'status' => 'active',
            'notes' => null,
        ];
    }
}
