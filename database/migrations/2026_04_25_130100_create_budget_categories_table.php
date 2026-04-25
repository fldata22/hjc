<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('budget_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $table->string('name', 64);
            $table->decimal('allocated_amount', 12, 2)->default(0);
            $table->unsignedTinyInteger('order_index')->default(0);
            $table->timestamps();
            $table->index(['crusade_id', 'order_index']);
        });
    }
    public function down(): void { Schema::dropIfExists('budget_categories'); }
};
