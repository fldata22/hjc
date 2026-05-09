<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OutreachActivity extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'kind', 'occurred_on', 'zone_id',
        'team_lead_name', 'households_reached', 'conversations_count',
        'pamphlets_distributed', 'route_summary', 'notes',
    ];

    protected $casts = ['occurred_on' => 'date'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }
}
