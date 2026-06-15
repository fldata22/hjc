<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TownProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'zone_id',
        'language_primary',
        'language_secondary',
        'religion_primary',
        'religion_mix_notes',
        'prior_crusade_year',
        'prior_crusade_notes',
        'key_contacts',
        'notes',
        'country',
        'region',
        'latitude',
        'longitude',
        'government_openness_rating',
        'demographic_notes',
        'population_estimate',
    ];

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }
}
