<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pledge extends Model
{
    use HasFactory;

    protected $fillable = ['pastor_id', 'pledge_meeting_id', 'resource', 'quantity'];

    protected $casts = ['quantity' => 'decimal:2'];

    public function pastor(): BelongsTo
    {
        return $this->belongsTo(Pastor::class);
    }

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(PledgeMeeting::class, 'pledge_meeting_id');
    }
}
