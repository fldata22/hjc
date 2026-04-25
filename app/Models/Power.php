<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Power extends Model
{
    use HasFactory;

    protected $fillable = ['code', 'name', 'order_index', 'description'];

    public function activityEntries(): HasMany
    {
        return $this->hasMany(ActivityEntry::class);
    }
}
