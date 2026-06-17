<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Donor;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DonorController extends Controller
{
    private const KINDS = ['individual', 'organization', 'foundation', 'church'];
    private const STATUSES = ['prospect', 'engaged', 'committed', 'given', 'declined'];

    public function index(Request $request): JsonResponse
    {
        $q = Donor::query();

        if ($request->filled('crusade_id')) {
            $q->where('crusade_id', $request->integer('crusade_id'));
        }
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('kind')) {
            $q->where('kind', $request->string('kind'));
        }

        $rows = $q->orderBy('status')->orderBy('name')->get();

        $pledged = (float) Donor::query()
            ->whereIn('status', ['committed', 'given'])
            ->sum('pledge_amount');
        $given = (float) Donor::query()
            ->where('status', 'given')
            ->sum('pledge_amount');

        $totals = [
            'pledged' => number_format($pledged, 2, '.', ''),
            'given' => number_format($given, 2, '.', ''),
        ];

        return response()->json(['data' => $rows, 'meta' => ['totals' => $totals]]);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'crusade_id' => 'required|exists:crusades,id',
            'contact_id' => 'nullable|exists:contacts,id',
            'name' => 'required|string|max:128',
            'organization' => 'nullable|string|max:128',
            'kind' => 'required|in:' . implode(',', self::KINDS),
            'pledge_amount' => 'nullable|numeric|min:0',
            'status' => 'sometimes|in:' . implode(',', self::STATUSES),
            'last_contact_at' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $v['status'] = $v['status'] ?? 'prospect';

        $donor = Donor::create($v);
        $orgPart = $donor->organization ? " ({$donor->organization})" : '';
        ActivityLogger::log(
            $donor->crusade_id,
            $request->user()?->id,
            'donors',
            "Donor added: {$donor->name}{$orgPart}",
        );
        return response()->json(['data' => $donor], 201);
    }

    public function show(Donor $donor): JsonResponse
    {
        return response()->json(['data' => $donor]);
    }

    public function update(Request $request, Donor $donor): JsonResponse
    {
        $v = $request->validate([
            'contact_id' => 'sometimes|nullable|exists:contacts,id',
            'name' => 'sometimes|string|max:128',
            'organization' => 'sometimes|nullable|string|max:128',
            'kind' => 'sometimes|in:' . implode(',', self::KINDS),
            'pledge_amount' => 'sometimes|nullable|numeric|min:0',
            'status' => 'sometimes|in:' . implode(',', self::STATUSES),
            'last_contact_at' => 'sometimes|nullable|date',
            'notes' => 'sometimes|nullable|string',
        ]);

        $oldStatus = $donor->status;
        $donor->update($v);
        if (isset($v['status']) && $v['status'] !== $oldStatus) {
            ActivityLogger::log(
                $donor->crusade_id,
                $request->user()?->id,
                'donors',
                "Donor {$donor->name}: {$oldStatus} → {$donor->status}",
            );
        }
        return response()->json(['data' => $donor]);
    }

    public function destroy(Donor $donor): JsonResponse
    {
        $donor->delete();
        return response()->json(null, 204);
    }
}
