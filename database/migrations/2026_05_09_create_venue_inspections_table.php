<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('venue_inspections', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->date('inspected_at');
            $t->string('inspector_name', 128);
            $t->boolean('capacity_verified')->default(false);
            $t->boolean('exits_clear')->default(false);
            $t->boolean('power_tested')->default(false);
            $t->boolean('sound_tested')->default(false);
            $t->text('permits_status')->nullable();
            $t->string('photo_url', 255)->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'inspected_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('venue_inspections');
    }
};
