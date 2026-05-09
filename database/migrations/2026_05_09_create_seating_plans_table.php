<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('seating_plans', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->unique()->constrained()->cascadeOnDelete();
            $t->integer('estimated_capacity')->nullable();
            $t->integer('vip_seating_count')->nullable();
            $t->integer('general_seating_count')->nullable();
            $t->integer('counsellor_area_count')->nullable();
            $t->string('chair_source', 128)->nullable();
            $t->text('layout_notes')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seating_plans');
    }
};
