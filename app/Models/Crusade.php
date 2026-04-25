<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Crusade extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'city', 'opens_at', 'closes_at',
        'budget_total', 'pastors_target', 'awareness_target_pct',
    ];

    protected $casts = [
        'opens_at' => 'date',
        'closes_at' => 'date',
        'budget_total' => 'decimal:2',
    ];
}
