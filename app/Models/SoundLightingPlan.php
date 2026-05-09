<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SoundLightingPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id',
        'sound_provider',
        'sound_capacity_notes',
        'lighting_provider',
        'lighting_setup_notes',
        'generator_provider',
        'generator_kva',
        'has_backup_power',
        'power_notes',
        'equipment_notes',
    ];

    protected $casts = [
        'has_backup_power' => 'boolean',
    ];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }
}
