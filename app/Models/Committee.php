<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Committee extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'name', 'chair_name', 'focus_area', 'status', 'deliverables_done_pct', 'member_count', 'next_meeting_on'];
    protected $casts = ['next_meeting_on' => 'date'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
}
