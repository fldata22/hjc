<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Contact::query();

        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        if ($request->filled('zone_id')) {
            $q->where('zone_id', $request->integer('zone_id'));
        }
        if ($request->filled('q')) {
            $term = $request->string('q');
            $q->where(function ($w) use ($term) {
                $w->where('full_name', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%")
                    ->orWhere('title', 'like', "%{$term}%");
            });
        }

        return response()->json([
            'data' => $q->orderBy('full_name')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'zone_id' => 'nullable|exists:zones,id',
            'church_id' => 'nullable|exists:churches,id',
            'full_name' => 'required|string|max:128',
            'title' => 'nullable|string|max:64',
            'phone' => 'nullable|string|max:32',
            'email' => 'nullable|email|max:128',
            'notes' => 'nullable|string',
        ]);

        $contact = Contact::create($v);
        ActivityLogger::log(
            $contact->crusade_id,
            $request->user()?->id,
            'people',
            "Contact added: {$contact->full_name}",
        );

        return response()->json(['data' => $contact], 201);
    }

    public function show(Contact $contact): JsonResponse
    {
        return response()->json(['data' => $contact]);
    }

    public function update(Request $request, Contact $contact): JsonResponse
    {
        $v = $request->validate([
            'zone_id' => 'sometimes|nullable|exists:zones,id',
            'church_id' => 'sometimes|nullable|exists:churches,id',
            'full_name' => 'sometimes|string|max:128',
            'title' => 'sometimes|nullable|string|max:64',
            'phone' => 'sometimes|nullable|string|max:32',
            'email' => 'sometimes|nullable|email|max:128',
            'notes' => 'sometimes|nullable|string',
        ]);

        $contact->update($v);

        return response()->json(['data' => $contact]);
    }

    public function destroy(Contact $contact): JsonResponse
    {
        $contact->delete();

        return response()->json(null, 204);
    }
}
