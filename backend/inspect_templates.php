<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$token = env('WHATSAPP_ACCESS_TOKEN');
$waba = env('WHATSAPP_BUSINESS_ACCOUNT_ID');

$res = \Illuminate\Support\Facades\Http::withToken($token)
    ->get("https://graph.facebook.com/v21.0/{$waba}/message_templates");

$json = $res->json();
foreach ($json['data'] ?? [] as $t) {
    echo "=== TPL: " . $t['name'] . " (" . $t['category'] . ") ===\n";
    print_r($t['components']);
    echo "\n";
}
