<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Pastor extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'crusade_id', 'full_name', 'church_id', 'zone_id',
        'phone', 'email', 'address', 'pastor_since',
        'pipeline_stage', 'last_contact_at',
    ];

    protected $casts = [
        'last_contact_at' => 'datetime',
    ];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function identifications(): HasMany
    {
        return $this->hasMany(PastorIdentification::class);
    }

    public function pledges(): HasMany
    {
        return $this->hasMany(Pledge::class);
    }
}
