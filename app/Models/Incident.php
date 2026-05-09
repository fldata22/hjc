<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Incident extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'kind', 'occurred_on', 'occurred_at_time', 'severity',
        'location', 'description', 'response_taken', 'transported_to', 'resolution',
    ];

    protected $casts = ['occurred_on' => 'date'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }
}
