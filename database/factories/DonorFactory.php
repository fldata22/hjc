<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class DonorFactory extends Factory
{
    public function definition(): array
    {
        $kind = $this->faker->randomElement(['individual', 'organization', 'foundation', 'church']);
        return [
            'crusade_id' => Crusade::factory(),
            'name' => $kind === 'individual' ? $this->faker->name() : $this->faker->company(),
            'organization' => $kind === 'individual' && $this->faker->boolean(40) ? $this->faker->company() : null,
            'kind' => $kind,
            'pledge_amount' => $this->faker->boolean(70) ? $this->faker->numberBetween(500, 50000) : null,
            'status' => $this->faker->randomElement(['prospect', 'engaged', 'committed', 'given', 'declined']),
            'last_contact_at' => $this->faker->boolean(60) ? $this->faker->dateTimeBetween('-30 days', 'now')->format('Y-m-d') : null,
            'notes' => null,
        ];
    }
}
