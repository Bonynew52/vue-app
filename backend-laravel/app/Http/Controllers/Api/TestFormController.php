<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TestFormController
{
    private const STORAGE_PATH = 'test-form-submissions.json';

    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'data' => $this->submissions(),
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

        $submission = [
            'id' => now()->timestamp,
            'received_at' => now()->toIso8601String(),
            ...$data,
        ];

        $submissions = $this->submissions();
        array_unshift($submissions, $submission);

        Storage::disk('local')->put(
            self::STORAGE_PATH,
            json_encode($submissions, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );

        return response()->json([
            'status' => 'received',
            'message' => 'Formulario recibido por Laravel.',
            'data' => $submission,
        ], 201);
    }

    private function submissions(): array
    {
        if (! Storage::disk('local')->exists(self::STORAGE_PATH)) {
            return [];
        }

        $content = Storage::disk('local')->get(self::STORAGE_PATH);

        return json_decode($content, true) ?: [];
    }
}
