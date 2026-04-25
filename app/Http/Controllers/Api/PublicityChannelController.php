<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AwarenessSurvey;
use App\Models\Crusade;
use App\Models\PublicityChannel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicityChannelController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => PublicityChannel::orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'name' => 'required|string|max:128',
            'channel_type' => 'required|in:radio,print,ooh,sms,tv',
            'reach_estimate' => 'nullable|string|max:64',
            'notes' => 'nullable|string|max:255',
            'status' => 'nullable|in:live,in_progress,scheduled,blocked',
            'spend_to_date' => 'nullable|numeric|min:0',
        ]);
        return response()->json(['data' => PublicityChannel::create($v)], 201);
    }

    public function show(PublicityChannel $publicityChannel): JsonResponse { return response()->json(['data' => $publicityChannel]); }

    public function update(Request $request, PublicityChannel $publicityChannel): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string|max:128',
            'channel_type' => 'sometimes|in:radio,print,ooh,sms,tv',
            'reach_estimate' => 'sometimes|nullable|string|max:64',
            'notes' => 'sometimes|nullable|string|max:255',
            'status' => 'sometimes|in:live,in_progress,scheduled,blocked',
            'spend_to_date' => 'sometimes|numeric|min:0',
        ]);
        $publicityChannel->update($v);
        return response()->json(['data' => $publicityChannel]);
    }

    public function destroy(PublicityChannel $publicityChannel): JsonResponse
    {
        $publicityChannel->delete();
        return response()->json(null, 204);
    }

    public function awarenessSpend(): JsonResponse
    {
        $crusade = Crusade::firstOrFail();
        $awareness = AwarenessSurvey::where('crusade_id', $crusade->id)
            ->selectRaw('survey_number, SUM(surveyed_count) as s, SUM(attending_yes_count) as a')
            ->groupBy('survey_number')
            ->orderBy('survey_number')
            ->get();

        $totalSpend = (float) PublicityChannel::where('crusade_id', $crusade->id)->sum('spend_to_date');

        $rows = $awareness->map(fn ($r) => [
            'survey_number' => (int) $r->survey_number,
            'awareness_pct' => $r->s > 0 ? number_format($r->a / $r->s * 100, 2, '.', '') : '0.00',
            'spend_total' => number_format($totalSpend, 2, '.', ''),
        ]);

        return response()->json(['data' => $rows]);
    }
}
