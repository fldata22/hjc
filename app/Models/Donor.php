<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Donor extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'contact_id', 'name', 'organization', 'kind',
        'pledge_amount', 'status', 'last_contact_at', 'notes',
    ];

    protected $casts = [
        'last_contact_at' => 'date',
        'pledge_amount' => 'decimal:2',
    ];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }
}
