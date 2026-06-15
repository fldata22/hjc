<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetTransaction extends Model
{
    use HasFactory;
    protected $fillable = [
        'crusade_id', 'budget_category_id', 'description',
        'occurred_on', 'kind', 'amount', 'receipt_photo_url',
        'currency', 'exchange_rate_to_usd', 'status', 'approved_by', 'approved_at',
    ];
    protected $casts = [
        'occurred_on' => 'date',
        'amount' => 'decimal:2',
        'exchange_rate_to_usd' => 'decimal:4',
        'approved_at' => 'datetime',
    ];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
    public function category(): BelongsTo { return $this->belongsTo(BudgetCategory::class, 'budget_category_id'); }
    public function approvedBy(): BelongsTo { return $this->belongsTo(\App\Models\User::class, 'approved_by'); }
}
