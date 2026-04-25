<?php

namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class PledgeMeetingFactory extends Factory
{
    public function definition(): array
    {
        static $seq = 0;
        $seq++;
        return [
            'crusade_id' => Crusade::factory(),
            'sequence' => 'M' . $seq,
            'held_on' => fake()->dateTimeThisYear()->format('Y-m-d'),
            'venue' => fake()->city(),
            'status' => fake()->randomElement(['upcoming', 'done']),
        ];
    }
}
