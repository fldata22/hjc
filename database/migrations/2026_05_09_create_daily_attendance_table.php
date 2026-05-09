<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('daily_attendance', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->date('counted_on');
            $t->integer('count');
            $t->string('estimation_method', 64)->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'counted_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_attendance');
    }
};
