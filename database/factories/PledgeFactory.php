<?php

namespace Database\Factories;

use App\Models\Pastor;
use App\Models\PledgeMeeting;
use Illuminate\Database\Eloquent\Factories\Factory;

class PledgeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'pastor_id' => Pastor::factory(),
            'pledge_meeting_id' => PledgeMeeting::factory(),
            'resource' => fake()->randomElement(['choir', 'prayer', 'ushers', 'counsellors', 'buses', 'money']),
            'quantity' => fake()->numberBetween(1, 50),
        ];
    }
}
