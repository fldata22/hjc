<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('budget_transactions', function (Blueprint $table) {
            $table->string('receipt_photo_url', 255)->nullable()->after('amount');
        });
    }

    public function down(): void
    {
        Schema::table('budget_transactions', function (Blueprint $table) {
            $table->dropColumn('receipt_photo_url');
        });
    }
};
