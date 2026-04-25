<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConferenceRegistration extends Model
{
    use HasFactory;
    protected $fillable = ['conference_id', 'pastor_id', 'track_id', 'paid_amount', 'paid_in_full', 'registered_at'];
    protected $casts = ['paid_amount' => 'decimal:2', 'paid_in_full' => 'boolean', 'registered_at' => 'datetime'];
    public function conference(): BelongsTo { return $this->belongsTo(Conference::class); }
    public function pastor(): BelongsTo { return $this->belongsTo(Pastor::class); }
    public function track(): BelongsTo { return $this->belongsTo(ConferenceTrack::class, 'track_id'); }
}
