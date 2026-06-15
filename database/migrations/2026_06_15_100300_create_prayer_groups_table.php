<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('prayer_groups', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->foreignId('zone_id')->nullable()->constrained('zones')->nullOnDelete();
            $t->string('name', 128);
            $t->string('leader_name', 128)->nullable();
            $t->string('leader_phone', 32)->nullable();
            $t->unsignedInteger('members_count')->default(0);
            $t->enum('meeting_frequency', ['daily', 'weekly', 'other'])->default('weekly');
            $t->string('meeting_day', 16)->nullable();
            $t->time('meeting_time')->nullable();
            $t->string('location', 128)->nullable();
            $t->string('status', 16)->default('active');
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prayer_groups');
    }
};
