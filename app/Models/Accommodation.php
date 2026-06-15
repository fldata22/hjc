<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Accommodation extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'name', 'type', 'address', 'capacity',
        'occupants_description', 'contact_name', 'contact_phone',
        'check_in_date', 'check_out_date', 'cost_per_night',
        'currency', 'status', 'notes',
    ];

    protected $casts = [
        'check_in_date' => 'date',
        'check_out_date' => 'date',
        'cost_per_night' => 'decimal:2',
    ];

    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
}
