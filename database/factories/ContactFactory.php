<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class ContactFactory extends Factory
{
    protected $model = Contact::class;

    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'zone_id' => null,
            'church_id' => null,
            'full_name' => $this->faker->name(),
            'title' => $this->faker->boolean(50) ? $this->faker->jobTitle() : null,
            'phone' => $this->faker->boolean(70) ? $this->faker->phoneNumber() : null,
            'email' => $this->faker->boolean(40) ? $this->faker->safeEmail() : null,
            'notes' => null,
        ];
    }
}
