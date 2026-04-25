<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('committees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('name', 64);
            $table->string('chair_name', 128);
            $table->string('focus_area', 32)->nullable();
            $table->enum('status', ['on_track', 'watch', 'at_risk'])->default('on_track');
            $table->unsignedTinyInteger('deliverables_done_pct')->default(0);
            $table->unsignedSmallInteger('member_count')->default(0);
            $table->date('next_meeting_on')->nullable();
            $table->timestamps();
            $table->index(['crusade_id', 'status']);
        });
    }
    public function down(): void { Schema::dropIfExists('committees'); }
};
