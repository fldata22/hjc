<?php

namespace App\Services;

use App\Models\ActivityEntry;
use App\Models\Power;
use Carbon\CarbonInterface;

class ActivityLogger
{
    /** @var array<string,int> Cached power-code → power-id lookup. */
    private static array $cache = [];

    public static function log(
        int $crusadeId,
        ?int $userId,
        string $powerCode,
        string $description,
        string $status = 'done',
        ?CarbonInterface $occurredAt = null,
    ): ?ActivityEntry {
        $powerId = self::$cache[$powerCode] ??= (int) (Power::where('code', $powerCode)->value('id') ?? 0);
        if ($powerId === 0) return null;

        return ActivityEntry::create([
            'crusade_id' => $crusadeId,
            'user_id' => $userId,
            'power_id' => $powerId,
            'description' => $description,
            'status' => $status,
            'occurred_at' => $occurredAt ?? now(),
        ]);
    }
}
