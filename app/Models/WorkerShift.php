<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkerShift extends Model
{
    use HasFactory;

    protected $fillable = [
        'crusade_id', 'worker_id', 'group_type',
        'shift_date', 'start_time', 'end_time',
        'location', 'status', 'notes',
    ];

    protected $casts = [
        'shift_date' => 'date',
    ];

    public function crusade(): BelongsTo { return $this->belongsTo(Crusade::class); }
    public function worker(): BelongsTo { return $this->belongsTo(Worker::class); }
}
