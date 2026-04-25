<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('worker_rehearsals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->foreignId('zone_id')->constrained()->cascadeOnDelete();
            $table->enum('group', ['choir', 'prayer', 'ushers', 'counsellors']);
            $table->unsignedTinyInteger('session_number');
            $table->unsignedInteger('attendance_count');
            $table->timestamps();
            $table->unique(['crusade_id', 'zone_id', 'group', 'session_number']);
            $table->index(['crusade_id', 'group', 'session_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('worker_rehearsals');
    }
};
