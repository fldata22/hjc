<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->foreignId('zone_id')->nullable()->constrained()->nullOnDelete();
            $t->foreignId('church_id')->nullable()->constrained()->nullOnDelete();
            $t->string('full_name', 128);
            $t->string('title', 64)->nullable();
            $t->string('phone', 32)->nullable();
            $t->string('email', 128)->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'full_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
