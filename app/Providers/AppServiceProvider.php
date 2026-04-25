<?php

namespace App\Providers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        JsonResponse::macro('withFloatPrecision', fn () => $this);
        // Preserve zero fraction so 100.0 serializes as 100.0, not 100
        app()->resolving(JsonResponse::class, function (JsonResponse $response) {
            $response->setEncodingOptions($response->getEncodingOptions() | JSON_PRESERVE_ZERO_FRACTION);
        });
    }
}
