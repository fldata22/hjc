<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MediaMention extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'mentioned_on', 'kind', 'outlet',
        'headline', 'url', 'sentiment', 'summary',
    ];

    protected $casts = ['mentioned_on' => 'date'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }
}
