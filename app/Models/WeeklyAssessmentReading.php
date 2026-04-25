<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeeklyAssessmentReading extends Model
{
    use HasFactory;
    protected $fillable = ['weekly_assessment_id', 'power_id', 'value_pct'];
    public function assessment(): BelongsTo { return $this->belongsTo(WeeklyAssessment::class, 'weekly_assessment_id'); }
    public function power(): BelongsTo { return $this->belongsTo(Power::class); }
}
