<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('budget_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->foreignId('budget_category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description', 255);
            $table->date('occurred_on');
            $table->enum('kind', ['income', 'expense']);
            $table->decimal('amount', 12, 2);
            $table->timestamps();
            $table->index(['crusade_id', 'occurred_on']);
            $table->index(['crusade_id', 'kind']);
        });
    }
    public function down(): void { Schema::dropIfExists('budget_transactions'); }
};
