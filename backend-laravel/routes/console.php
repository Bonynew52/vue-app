<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('app:ping', function (): void {
    $this->info('pong');
})->purpose('Verifica que la consola de Laravel responde.');
