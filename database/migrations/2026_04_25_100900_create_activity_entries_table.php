<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('activity_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('occurred_at');
            $table->text('description');
            $table->string('power', 32);  // pastors, awareness, …
            $table->enum('status', ['done', 'running'])->default('done');
            $table->timestamps();
            $table->index(['crusade_id', 'occurred_at']);
            $table->index(['crusade_id', 'power']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_entries');
    }
};
