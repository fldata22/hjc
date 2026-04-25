<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pastors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('full_name');
            $table->foreignId('church_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained()->nullOnDelete();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->unsignedSmallInteger('pastor_since')->nullable();
            $table->enum('pipeline_stage', ['identified', 'engaged', 'committed', 'active', 'champion'])->default('identified');
            $table->timestamp('last_contact_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['crusade_id', 'pipeline_stage']);
            $table->index(['crusade_id', 'zone_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pastors');
    }
};
