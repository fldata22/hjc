<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('budget_transactions', function (Blueprint $t) {
            $t->char('currency', 3)->default('USD')->after('amount');
            $t->decimal('exchange_rate_to_usd', 10, 4)->default(1.0)->after('currency');
            $t->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->after('exchange_rate_to_usd');
            $t->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete()->after('status');
            $t->timestamp('approved_at')->nullable()->after('approved_by');
        });
    }

    public function down(): void
    {
        Schema::table('budget_transactions', function (Blueprint $t) {
            $t->dropForeign(['approved_by']);
            $t->dropColumn(['currency', 'exchange_rate_to_usd', 'status', 'approved_by', 'approved_at']);
        });
    }
};
