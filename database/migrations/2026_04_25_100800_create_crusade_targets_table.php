<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('crusade_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->enum('resource', ['choir', 'prayer', 'ushers', 'counsellors', 'buses', 'money']);
            $table->decimal('target_quantity', 12, 2);
            $table->timestamps();
            $table->unique(['crusade_id', 'resource']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crusade_targets');
    }
};
