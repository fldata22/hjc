<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('donors', function (Blueprint $t) {
            $t->id();
            $t->foreignId('crusade_id')->constrained()->cascadeOnDelete();
            $t->string('name', 128);
            $t->string('organization', 128)->nullable();
            $t->enum('kind', ['individual', 'organization', 'foundation', 'church']);
            $t->decimal('pledge_amount', 12, 2)->nullable();
            $t->enum('status', ['prospect', 'engaged', 'committed', 'given', 'declined'])->default('prospect');
            $t->date('last_contact_at')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['crusade_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donors');
    }
};
