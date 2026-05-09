<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sound_lighting_plans', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->unique()->constrained()->cascadeOnDelete();
            $t->string('sound_provider', 128)->nullable();
            $t->text('sound_capacity_notes')->nullable();
            $t->string('lighting_provider', 128)->nullable();
            $t->text('lighting_setup_notes')->nullable();
            $t->string('generator_provider', 128)->nullable();
            $t->integer('generator_kva')->nullable();
            $t->boolean('has_backup_power')->default(false);
            $t->text('power_notes')->nullable();
            $t->text('equipment_notes')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sound_lighting_plans');
    }
};
