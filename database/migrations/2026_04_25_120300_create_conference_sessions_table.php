<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('conference_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conference_id')->constrained()->cascadeOnDelete();
            $table->foreignId('track_id')->nullable()->constrained('conference_tracks')->nullOnDelete();
            $table->string('day_label', 16);
            $table->string('name', 128);
            $table->string('speaker', 128)->nullable();
            $table->enum('session_kind', ['plenary', 'track']);
            $table->unsignedInteger('rsvp_count')->default(0);
            $table->timestamps();
            $table->index(['conference_id', 'session_kind']);
        });
    }
    public function down(): void { Schema::dropIfExists('conference_sessions'); }
};
