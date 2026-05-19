<?php

use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\TestFormController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);
Route::get('/test-form', [TestFormController::class, 'index']);
Route::post('/test-form', [TestFormController::class, 'store']);
