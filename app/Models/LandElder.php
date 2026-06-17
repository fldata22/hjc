<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LandElder extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'contact_id', 'name', 'title', 'region',
        'phone', 'email', 'status', 'last_contact_at', 'notes',
    ];

    protected $casts = ['last_contact_at' => 'date'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }
}
