<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrusadeTarget extends Model
{
    use HasFactory;

    protected $fillable = ['crusade_id', 'resource', 'target_quantity'];

    protected $casts = ['target_quantity' => 'decimal:2'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }
}
