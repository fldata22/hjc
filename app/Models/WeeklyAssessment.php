<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WeeklyAssessment extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'week_number', 'prompted_at', 'self_score', 'notes', 'decisions_needed', 'submitted_at'];
    protected $casts = ['prompted_at' => 'datetime', 'submitted_at' => 'datetime'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
    public function readings(): HasMany { return $this->hasMany(WeeklyAssessmentReading::class); }
    public function risks(): HasMany { return $this->hasMany(WeeklyAssessmentRisk::class)->orderBy('ordering'); }
}
