<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('prayer_sessions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('prayer_group_id')->constrained('prayer_groups')->cascadeOnDelete();
            $t->date('session_date');
            $t->unsignedInteger('attendees_count')->default(0);
            $t->string('focus_theme', 128)->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['prayer_group_id', 'session_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prayer_sessions');
    }
};
