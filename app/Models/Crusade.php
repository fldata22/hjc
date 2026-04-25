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
        'population', 'pap', 'convoy_target', 'makarios_target',
    ];

    protected $casts = [
        'opens_at' => 'date',
        'closes_at' => 'date',
        'budget_total' => 'decimal:2',
    ];

    public function pledgeMeetings(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PledgeMeeting::class);
    }
}
