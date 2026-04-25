<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkerRehearsal extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'zone_id', 'group', 'session_number', 'attendance_count',
    ];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }
}
