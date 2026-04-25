<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stakeholder extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'name', 'org', 'role', 'pipeline_stage', 'status_label', 'last_contact_at', 'notes'];
    protected $casts = ['last_contact_at' => 'datetime'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
}
