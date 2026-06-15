<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('welfare_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->enum('category', ['meals', 'transport', 'medical', 'allowance', 'other'])->default('other');
            $t->string('description', 255);
            $t->string('beneficiary', 128)->nullable();
            $t->decimal('amount', 10, 2)->nullable();
            $t->char('currency', 3)->default('USD');
            $t->date('item_date')->nullable();
            $t->enum('status', ['planned', 'processed'])->default('planned');
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('welfare_items');
    }
};
