<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conference;
use App\Models\ConferenceTrack;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ConferenceTrackController extends Controller
{
    public function index(Conference $conference): JsonResponse
    {
        return response()->json(['data' => $conference->tracks()->orderBy('name')->get()]);
    }

    public function store(Request $request, Conference $conference): JsonResponse
    {
        $v = $request->validate([
            'name' => ['required', 'string', 'max:64',
                Rule::unique('conference_tracks')->where(fn ($q) => $q->where('conference_id', $conference->id))],
            'capacity' => 'required|integer|min:0',
        ]);
        $v['conference_id'] = $conference->id;
        return response()->json(['data' => ConferenceTrack::create($v)], 201);
    }

    public function update(Request $request, ConferenceTrack $conferenceTrack): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string|max:64',
            'capacity' => 'sometimes|integer|min:0',
        ]);
        $conferenceTrack->update($v);
        return response()->json(['data' => $conferenceTrack]);
    }

    public function destroy(ConferenceTrack $conferenceTrack): JsonResponse
    {
        $conferenceTrack->delete();
        return response()->json(null, 204);
    }
}
