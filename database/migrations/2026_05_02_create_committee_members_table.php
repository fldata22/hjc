<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('committee_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->enum('kind', ['bot', 'cpc']);
            $table->string('name', 128);
            $table->string('role', 64);
            $table->string('org', 128)->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('email', 128)->nullable();
            $table->string('status', 32);
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->index(['crusade_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('committee_members');
    }
};
