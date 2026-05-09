<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyProgram extends Model
{
    use HasFactory;

    protected $fillable = ['crusade_id', 'occurred_on', 'speaker', 'topic', 'duration_minutes', 'key_moments', 'narrative'];

    protected $casts = ['occurred_on' => 'date'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }
}
