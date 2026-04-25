<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Permit extends Model
{
    use HasFactory;
    protected $fillable = ['crusade_id', 'name', 'agency', 'status', 'due_on', 'signed_on', 'notes'];
    protected $casts = ['due_on' => 'date', 'signed_on' => 'date'];
    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
}
