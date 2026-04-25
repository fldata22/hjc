<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Zone extends Model
{
    use HasFactory;

    protected $fillable = ['crusade_id', 'code', 'name', 'population', 'pap'];

    public function crusade(): BelongsTo
    {
        return $this->belongsTo(Crusade::class);
    }
}
