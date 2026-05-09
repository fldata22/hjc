<?php

namespace Database\Factories;

use App\Models\Zone;
use Illuminate\Database\Eloquent\Factories\Factory;

class TownProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'zone_id' => Zone::factory(),
            'language_primary' => $this->faker->randomElement(['Wala', 'Dagaare', 'Twi', 'Ewe', 'Ga']),
            'language_secondary' => null,
            'religion_primary' => $this->faker->randomElement(['Christian', 'Muslim', 'Mixed', 'Traditional']),
            'religion_mix_notes' => null,
            'prior_crusade_year' => null,
            'prior_crusade_notes' => null,
            'key_contacts' => null,
            'notes' => null,
        ];
    }
}
