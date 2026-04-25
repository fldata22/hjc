<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pastor_identifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pastor_id')->constrained()->cascadeOnDelete();
            $table->string('category', 32);   // PCM, BOT, …
            $table->string('sub_role', 32)->nullable(); // primary, member, chair, sec, champion
            $table->date('assigned_at');
            $table->foreignId('assigned_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['pastor_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pastor_identifications');
    }
};
