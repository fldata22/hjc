<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PublicityAsset extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'kind', 'title', 'status',
        'produced_on', 'deployed_on', 'quantity', 'notes',
    ];

    protected $casts = [
        'produced_on' => 'date',
        'deployed_on' => 'date',
    ];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }
}
