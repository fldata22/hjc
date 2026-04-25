<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PublicityChannel extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'name', 'channel_type', 'reach_estimate', 'notes', 'status', 'spend_to_date'];
    protected $casts = ['spend_to_date' => 'decimal:2'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
}
