<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PrayerGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'zone_id', 'name', 'leader_name', 'leader_phone',
        'members_count', 'meeting_frequency', 'meeting_day', 'meeting_time',
        'location', 'status', 'notes',
    ];

    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
    public function zone(): BelongsTo { return $this->belongsTo(Zone::class); }
    public function sessions(): HasMany { return $this->hasMany(PrayerSession::class); }
}
