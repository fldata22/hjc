<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('weekly_assessment_risks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('weekly_assessment_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('ordering');
            $table->enum('severity', ['critical', 'high', 'medium']);
            $table->string('text', 255);
            $table->timestamps();
            $table->index(['weekly_assessment_id', 'ordering']);
        });
    }
    public function down(): void { Schema::dropIfExists('weekly_assessment_risks'); }
};
