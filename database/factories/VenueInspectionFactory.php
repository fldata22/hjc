<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class VenueInspectionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'inspected_at' => now()->subDays(rand(0, 14))->toDateString(),
            'inspector_name' => $this->faker->name(),
            'capacity_verified' => $this->faker->boolean(70),
            'exits_clear' => $this->faker->boolean(80),
            'power_tested' => $this->faker->boolean(60),
            'sound_tested' => $this->faker->boolean(50),
            'permits_status' => null,
            'photo_url' => null,
            'notes' => null,
        ];
    }
}
