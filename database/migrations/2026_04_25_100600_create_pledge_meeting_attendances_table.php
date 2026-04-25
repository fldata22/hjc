<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pledge_meeting_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pledge_meeting_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pastor_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['pledge_meeting_id', 'pastor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pledge_meeting_attendances');
    }
};
