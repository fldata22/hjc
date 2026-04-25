<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class CrusadeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'Lusaka 2026',
            'city' => 'Lusaka',
            'opens_at' => '2026-05-02',
            'closes_at' => '2026-05-04',
            'budget_total' => 80000,
            'pastors_target' => 1088,
            'awareness_target_pct' => 60,
            'population' => 2200000,
            'pap' => 1800000,
            'convoy_target' => 24,
            'makarios_target' => 500,
        ];
    }
}
