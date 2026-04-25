<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PastorIdentification extends Model
{
    use HasFactory;

    protected $fillable = ['pastor_id', 'category', 'sub_role', 'assigned_at', 'assigned_by_user_id'];

    protected $casts = ['assigned_at' => 'date'];

    public function pastor(): BelongsTo
    {
        return $this->belongsTo(Pastor::class);
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_user_id');
    }
}
