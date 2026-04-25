<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conference extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'name', 'starts_on', 'ends_on', 'capacity'];
    protected $casts = ['starts_on' => 'date', 'ends_on' => 'date'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
    public function tracks(): HasMany { return $this->hasMany(ConferenceTrack::class); }
    public function sessions(): HasMany { return $this->hasMany(ConferenceSession::class); }
    public function registrations(): HasMany { return $this->hasMany(ConferenceRegistration::class); }
}
