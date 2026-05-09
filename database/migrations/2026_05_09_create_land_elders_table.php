<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('land_elders', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->string('name', 128);
            $t->string('title', 64)->nullable();
            $t->string('region', 128)->nullable();
            $t->string('phone', 32)->nullable();
            $t->string('email', 128)->nullable();
            $t->enum('status', ['identified', 'courted', 'blessed', 'neutral', 'opposed'])->default('identified');
            $t->date('last_contact_at')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('land_elders');
    }
};
