<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PledgeMeeting extends Model
{
    use HasFactory;

    protected $fillable = ['crusade_id', 'sequence', 'held_on', 'venue', 'status'];

    protected $casts = ['held_on' => 'date'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }

    public function attendees(): BelongsToMany
    {
        return $this->belongsToMany(Pastor::class, 'pledge_meeting_attendances')->withTimestamps();
    }

    public function pledges(): HasMany
    {
        return $this->hasMany(Pledge::class);
    }
}
