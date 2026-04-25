<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeeklyAssessmentRisk extends Model
{
    use HasFactory;
    protected $fillable = ['weekly_assessment_id', 'ordering', 'severity', 'text'];
    public function assessment(): BelongsTo { return $this->belongsTo(WeeklyAssessment::class, 'weekly_assessment_id'); }
}
