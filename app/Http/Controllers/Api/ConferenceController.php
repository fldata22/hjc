<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conference;
use App\Models\ConferenceRegistration;
use App\Models\ConferenceSession;
use App\Models\ConferenceTrack;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConferenceController extends Controller
{
    public function index(): JsonResponse { return response()->json(['data' => Conference::all()]); }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'name' => 'required|string|max:128',
            'starts_on' => 'required|date',
            'ends_on' => 'required|date|after_or_equal:starts_on',
            'capacity' => 'required|integer|min:0',
        ]);
        return response()->json(['data' => Conference::create($v)], 201);
    }

    public function show(Conference $conference): JsonResponse { return response()->json(['data' => $conference]); }

    public function update(Request $request, Conference $conference): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string|max:128',
            'starts_on' => 'sometimes|date',
            'ends_on' => 'sometimes|date',
            'capacity' => 'sometimes|integer|min:0',
        ]);
        $conference->update($v);
        return response()->json(['data' => $conference]);
    }

    public function destroy(Conference $conference): JsonResponse
    {
        $conference->delete();
        return response()->json(null, 204);
    }

    public function registrationSummary(Conference $conference): JsonResponse
    {
        $regs = ConferenceRegistration::where('conference_id', $conference->id);
        $registered = (clone $regs)->count();
        $paidInFull = (clone $regs)->where('paid_in_full', true)->count();
        $sumPaid = (float) (clone $regs)->sum('paid_amount');

        $sessionCounts = ConferenceSession::where('conference_id', $conference->id)
            ->selectRaw('session_kind, COUNT(*) as n')->groupBy('session_kind')->pluck('n', 'session_kind');

        $tracks = ConferenceTrack::where('conference_id', $conference->id)->get()->map(function ($t) use ($conference) {
            $reg = ConferenceRegistration::where('conference_id', $conference->id)->where('track_id', $t->id)->count();
            return [
                'track_id' => $t->id,
                'name' => $t->name,
                'capacity' => $t->capacity,
                'registered' => $reg,
                'pct' => $t->capacity > 0 ? number_format($reg / $t->capacity * 100, 2, '.', '') : '0.00',
            ];
        })->values();

        return response()->json(['data' => [
            'registered' => $registered,
            'paid_in_full' => $paidInFull,
            'sum_paid_amount' => number_format($sumPaid, 2, '.', ''),
            'capacity' => $conference->capacity,
            'pct_of_capacity' => $conference->capacity > 0 ? number_format($registered / $conference->capacity * 100, 2, '.', '') : '0.00',
            'sessions' => [
                'plenary' => (int) ($sessionCounts['plenary'] ?? 0),
                'track' => (int) ($sessionCounts['track'] ?? 0),
            ],
            'tracks' => $tracks,
        ]]);
    }
}
