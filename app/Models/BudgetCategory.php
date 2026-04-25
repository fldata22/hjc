<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BudgetCategory extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'name', 'allocated_amount', 'order_index'];
    protected $casts = ['allocated_amount' => 'decimal:2'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
    public function transactions(): HasMany { return $this->hasMany(BudgetTransaction::class); }
}
