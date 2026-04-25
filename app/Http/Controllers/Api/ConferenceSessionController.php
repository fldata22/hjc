<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conference;
use App\Models\ConferenceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConferenceSessionController extends Controller
{
    public function index(Conference $conference): JsonResponse
    {
        return response()->json(['data' => $conference->sessions()->orderBy('day_label')->orderBy('name')->get()]);
    }

    public function store(Request $request, Conference $conference): JsonResponse
    {
        $v = $request->validate([
            'day_label' => 'required|string|max:16',
            'name' => 'required|string|max:128',
            'speaker' => 'nullable|string|max:128',
            'session_kind' => 'required|in:plenary,track',
            'track_id' => 'nullable|exists:conference_tracks,id',
            'rsvp_count' => 'nullable|integer|min:0',
        ]);
        $v['conference_id'] = $conference->id;
        return response()->json(['data' => ConferenceSession::create($v)], 201);
    }

    public function update(Request $request, ConferenceSession $conferenceSession): JsonResponse
    {
        $v = $request->validate([
            'day_label' => 'sometimes|string|max:16',
            'name' => 'sometimes|string|max:128',
            'speaker' => 'sometimes|nullable|string|max:128',
            'session_kind' => 'sometimes|in:plenary,track',
            'track_id' => 'sometimes|nullable|exists:conference_tracks,id',
            'rsvp_count' => 'sometimes|integer|min:0',
        ]);
        $conferenceSession->update($v);
        return response()->json(['data' => $conferenceSession]);
    }

    public function destroy(ConferenceSession $conferenceSession): JsonResponse
    {
        $conferenceSession->delete();
        return response()->json(null, 204);
    }
}
