<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OrderController
{
    private const STORAGE_PATH = 'orders.json';

    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'data' => $this->orders(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:120'],
            'favorite' => ['required', 'string', 'max:80'],
            'message' => ['required', 'string', 'max:500'],
        ]);

        $order = [
            'id' => now()->timestamp,
            'received_at' => now()->toIso8601String(),
            ...$data,
        ];

        $orders = $this->orders();
        array_unshift($orders, $order);

        Storage::disk('local')->put(
            self::STORAGE_PATH,
            json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );

        return response()->json([
            'status' => 'received',
            'message' => 'Orden recibida por Laravel.',
            'data' => $order,
        ], 201);
    }

    private function orders(): array
    {
        if (! Storage::disk('local')->exists(self::STORAGE_PATH)) {
            return [];
        }

        $content = Storage::disk('local')->get(self::STORAGE_PATH);

        return json_decode($content, true) ?: [];
    }
}
