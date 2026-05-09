<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('daily_decisions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->date('decided_on');
            $t->integer('salvations')->default(0);
            $t->integer('rededications')->default(0);
            $t->integer('healings')->default(0);
            $t->integer('counselled')->default(0);
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'decided_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_decisions');
    }
};
