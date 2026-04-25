<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Crusade;
use App\Models\CrusadeTarget;
use App\Models\Pledge;
use Illuminate\Http\JsonResponse;

class PledgeSummaryController extends Controller
{
    public function show(): JsonResponse
    {
        $crusade = Crusade::firstOrFail();

        $pledged = Pledge::query()
            ->whereIn('pledge_meeting_id', $crusade->pledgeMeetings()->select('id'))
            ->selectRaw('resource, SUM(quantity) as total')
            ->groupBy('resource')
            ->pluck('total', 'resource');

        $targets = CrusadeTarget::where('crusade_id', $crusade->id)->pluck('target_quantity', 'resource');

        $resources = collect(['choir', 'prayer', 'ushers', 'counsellors', 'buses', 'money']);
        $data = $resources->mapWithKeys(fn ($r) => [
            $r => [
                'pledged' => number_format((float) ($pledged[$r] ?? 0), 2, '.', ''),
                'target' => number_format((float) ($targets[$r] ?? 0), 2, '.', ''),
            ],
        ]);

        return response()->json(['data' => $data]);
    }
}
