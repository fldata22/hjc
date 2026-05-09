<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('daily_programs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->date('occurred_on');
            $t->string('speaker', 128)->nullable();
            $t->string('topic', 255)->nullable();
            $t->integer('duration_minutes')->nullable();
            $t->text('key_moments')->nullable();
            $t->text('narrative')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'occurred_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_programs');
    }
};
