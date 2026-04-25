<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conference;
use App\Models\ConferenceRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConferenceRegistrationController extends Controller
{
    public function index(Conference $conference): JsonResponse
    {
        return response()->json(['data' => $conference->registrations()->orderByDesc('registered_at')->get()]);
    }

    public function store(Request $request, Conference $conference): JsonResponse
    {
        $v = $request->validate([
            'pastor_id' => 'nullable|exists:pastors,id',
            'track_id' => 'nullable|exists:conference_tracks,id',
            'paid_amount' => 'nullable|numeric|min:0',
            'paid_in_full' => 'nullable|boolean',
            'registered_at' => 'nullable|date',
        ]);
        $v['conference_id'] = $conference->id;
        $v['registered_at'] = $v['registered_at'] ?? now();
        return response()->json(['data' => ConferenceRegistration::create($v)], 201);
    }

    public function update(Request $request, ConferenceRegistration $conferenceRegistration): JsonResponse
    {
        $v = $request->validate([
            'track_id' => 'sometimes|nullable|exists:conference_tracks,id',
            'paid_amount' => 'sometimes|numeric|min:0',
            'paid_in_full' => 'sometimes|boolean',
        ]);
        $conferenceRegistration->update($v);
        return response()->json(['data' => $conferenceRegistration]);
    }

    public function destroy(ConferenceRegistration $conferenceRegistration): JsonResponse
    {
        $conferenceRegistration->delete();
        return response()->json(null, 204);
    }
}
