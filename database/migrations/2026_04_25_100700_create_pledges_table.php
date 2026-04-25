<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pledges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pastor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pledge_meeting_id')->constrained()->cascadeOnDelete();
            $table->enum('resource', ['choir', 'prayer', 'ushers', 'counsellors', 'buses', 'money']);
            $table->decimal('quantity', 12, 2);
            $table->timestamps();
            $table->index(['pledge_meeting_id', 'resource']);
            $table->index(['pastor_id', 'resource']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pledges');
    }
};
