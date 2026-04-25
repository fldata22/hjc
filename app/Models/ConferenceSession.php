<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConferenceSession extends Model
{
    use HasFactory;
    protected $fillable = ['conference_id', 'track_id', 'day_label', 'name', 'speaker', 'session_kind', 'rsvp_count'];
    public function conference(): BelongsTo { return $this->belongsTo(Conference::class); }
    public function track(): BelongsTo { return $this->belongsTo(ConferenceTrack::class, 'track_id'); }
}
