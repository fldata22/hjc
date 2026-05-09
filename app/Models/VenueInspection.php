<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VenueInspection extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id',
        'inspected_at',
        'inspector_name',
        'capacity_verified',
        'exits_clear',
        'power_tested',
        'sound_tested',
        'permits_status',
        'photo_url',
        'notes',
    ];

    protected $casts = [
        'inspected_at' => 'date',
        'capacity_verified' => 'boolean',
        'exits_clear' => 'boolean',
        'power_tested' => 'boolean',
        'sound_tested' => 'boolean',
    ];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }
}
