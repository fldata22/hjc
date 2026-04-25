<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConferenceTrack extends Model
{
    use HasFactory;
    protected $fillable = ['conference_id', 'name', 'capacity'];
    public function conference(): BelongsTo { return $this->belongsTo(Conference::class); }
    public function sessions(): HasMany { return $this->hasMany(ConferenceSession::class, 'track_id'); }
    public function registrations(): HasMany { return $this->hasMany(ConferenceRegistration::class, 'track_id'); }
}
