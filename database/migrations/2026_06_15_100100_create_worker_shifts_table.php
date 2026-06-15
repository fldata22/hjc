<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('worker_shifts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->foreignId('worker_id')->nullable()->constrained('workers')->nullOnDelete();
            $t->enum('group_type', [
                'choir', 'ushers', 'security', 'counsellors', 'prayer_warriors',
                'hospitality', 'technical', 'medical', 'childrens', 'general',
            ]);
            $t->date('shift_date');
            $t->time('start_time');
            $t->time('end_time');
            $t->string('location', 128)->nullable();
            $t->enum('status', ['scheduled', 'attended', 'absent'])->default('scheduled');
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'shift_date']);
            $t->index(['crusade_id', 'group_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('worker_shifts');
    }
};
