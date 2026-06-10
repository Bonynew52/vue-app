<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PickAndGoController
{
    private const STORAGE_PATH = 'pick_and_go.json';

    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'data' => $this->pickups(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:120'],
            'pickup_time' => ['nullable', 'string', 'max:80'],
            'items' => ['nullable', 'array'],
            'items.*.name' => ['required_with:items', 'string', 'max:120'],
            'items.*.quantity' => ['nullable', 'integer', 'min:1', 'max:99'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $pickup = [
            'id' => now()->timestamp,
            'status' => 'received',
            'received_at' => now()->toIso8601String(),
            'items' => [],
            ...$data,
        ];

        $pickups = $this->pickups();
        array_unshift($pickups, $pickup);

        Storage::disk('local')->put(
            self::STORAGE_PATH,
            json_encode($pickups, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );

        return response()->json([
            'status' => 'received',
            'message' => 'Pick and go recibido por Laravel.',
            'data' => $pickup,
        ], 201);
    }

    private function pickups(): array
    {
        if (! Storage::disk('local')->exists(self::STORAGE_PATH)) {
            return [];
        }

        $content = Storage::disk('local')->get(self::STORAGE_PATH);

        return json_decode($content, true) ?: [];
    }
}
