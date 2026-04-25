<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pledge_meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('sequence', 8);   // M1, M2, …
            $table->date('held_on');
            $table->string('venue');
            $table->enum('status', ['upcoming', 'done'])->default('upcoming');
            $table->timestamps();
            $table->unique(['crusade_id', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pledge_meetings');
    }
};
