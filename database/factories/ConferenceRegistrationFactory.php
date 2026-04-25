<?php
namespace Database\Factories;

use App\Models\Conference;
use App\Models\Pastor;
use Illuminate\Database\Eloquent\Factories\Factory;

class ConferenceRegistrationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'conference_id' => Conference::factory(),
            'pastor_id' => Pastor::factory(),
            'track_id' => null,
            'paid_amount' => fake()->randomElement([0, 20, 40]),
            'paid_in_full' => fake()->boolean(70),
            'registered_at' => fake()->dateTimeThisMonth(),
        ];
    }
}
