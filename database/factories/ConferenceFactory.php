<?php
namespace Database\Factories;

use App\Models\Crusade;
use Illuminate\Database\Eloquent\Factories\Factory;

class ConferenceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'crusade_id' => Crusade::factory(),
            'name' => 'HJC ' . fake()->year() . ' Pastors\' Conference',
            'starts_on' => '2026-04-30',
            'ends_on' => '2026-05-02',
            'capacity' => 820,
        ];
    }
}
