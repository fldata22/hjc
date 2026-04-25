<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('conference_tracks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conference_id')->constrained()->cascadeOnDelete();
            $table->string('name', 64);
            $table->unsignedInteger('capacity');
            $table->timestamps();
            $table->unique(['conference_id', 'name']);
        });
    }
    public function down(): void { Schema::dropIfExists('conference_tracks'); }
};
