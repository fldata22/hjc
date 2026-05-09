<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class SoundLightingPlanFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'sound_provider' => $this->faker->company(),
            'sound_capacity_notes' => null,
            'lighting_provider' => null,
            'lighting_setup_notes' => null,
            'generator_provider' => null,
            'generator_kva' => $this->faker->boolean(70) ? $this->faker->numberBetween(20, 200) : null,
            'has_backup_power' => $this->faker->boolean(),
            'power_notes' => null,
            'equipment_notes' => null,
        ];
    }
}
