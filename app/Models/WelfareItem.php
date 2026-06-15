<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WelfareItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'category', 'description', 'beneficiary',
        'amount', 'currency', 'item_date', 'status', 'notes',
    ];

    protected $casts = [
        'item_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
}
