<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeatingPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id',
        'estimated_capacity',
        'vip_seating_count',
        'general_seating_count',
        'counsellor_area_count',
        'chair_source',
        'layout_notes',
    ];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }
}
