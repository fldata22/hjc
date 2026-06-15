<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrayerSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'prayer_group_id', 'session_date', 'attendees_count', 'focus_theme', 'notes',
    ];

    protected $casts = [
        'session_date' => 'date',
    ];

    public function group(): BelongsTo { return $this->belongsTo(PrayerGroup::class, 'prayer_group_id'); }
}
