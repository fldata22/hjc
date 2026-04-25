<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AwarenessSurvey extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'zone_id', 'survey_number',
        'surveyed_count', 'attending_yes_count', 'taken_on',
    ];

    protected $casts = [
        'taken_on' => 'date',
    ];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function getPctAttribute(): float
    {
        if ($this->surveyed_count === 0) return 0.0;
        return round($this->attending_yes_count / $this->surveyed_count * 100, 2);
    }
}
