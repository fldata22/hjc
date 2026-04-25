<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('permits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('name', 128);
            $table->string('agency', 128);
            $table->enum('status', ['in_review', 'approved', 'rejected'])->default('in_review');
            $table->date('due_on')->nullable();
            $table->date('signed_on')->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->index(['crusade_id', 'status']);
        });
    }
    public function down(): void { Schema::dropIfExists('permits'); }
};
