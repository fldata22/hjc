<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('incidents', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->enum('kind', ['security', 'medical']);
            $t->date('occurred_on');
            $t->time('occurred_at_time')->nullable();
            $t->enum('severity', ['low', 'medium', 'high'])->default('low');
            $t->string('location', 128)->nullable();
            $t->text('description');
            $t->text('response_taken')->nullable();
            $t->string('transported_to', 128)->nullable();
            $t->text('resolution')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'kind', 'occurred_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incidents');
    }
};
