<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyDecision extends Model
{
    use HasFactory;

    protected $fillable = ['crusade_id', 'decided_on', 'salvations', 'rededications', 'healings', 'counselled', 'notes'];

    protected $casts = ['decided_on' => 'date'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }
}
