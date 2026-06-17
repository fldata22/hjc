<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    private const ENDPOINT = 'https://exp.host/--/api/v2/push/send';

    /**
     * Send an Expo push notification to one or more Expo push tokens.
     *
     * @param  string|array<int,string|null>  $tokens
     * @param  array<string,mixed>  $data
     */
    public static function send(string|array $tokens, string $title, string $body, array $data = []): void
    {
        $messages = collect(is_array($tokens) ? $tokens : [$tokens])
            ->filter(fn ($t) => is_string($t) && str_starts_with($t, 'ExponentPushToken'))
            ->unique()
            ->map(fn ($t) => [
                'to' => $t,
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
                'data' => $data,
            ])
            ->values()
            ->all();

        if (empty($messages)) {
            return;
        }

        // Expo accepts up to 100 messages per request.
        foreach (array_chunk($messages, 100) as $chunk) {
            try {
                Http::acceptJson()
                    ->asJson()
                    ->post(self::ENDPOINT, $chunk)
                    ->throw();
            } catch (\Throwable $e) {
                Log::warning('Expo push send failed: '.$e->getMessage());
            }
        }
    }
}
