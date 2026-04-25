<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityEntry extends Model
{
    use HasFactory;

    protected $fillable = ['crusade_id', 'user_id', 'occurred_at', 'description', 'power_id', 'status'];

    protected $casts = ['occurred_at' => 'datetime'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function power(): BelongsTo
    {
        return $this->belongsTo(Power::class);
    }
}
