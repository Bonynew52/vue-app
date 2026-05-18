<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Customer::query()->firstOrCreate(
            ['email' => 'cliente@example.com'],
            [
                'name' => 'Cliente de prueba',
                'phone' => '555-0100',
            ],
        );
    }
}
