<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected string $provider;
    protected ?string $accessToken;
    protected ?string $phoneNumberId;
    protected ?string $businessAccountId;
    protected string $apiVersion;
    protected string $templateName;
    protected string $languageCode;

    public function __construct()
    {
        $this->provider = config('services.whatsapp.provider', env('OTP_PROVIDER', 'mock'));
        $this->accessToken = config('services.whatsapp.access_token', env('WHATSAPP_ACCESS_TOKEN'));
        $this->phoneNumberId = config('services.whatsapp.phone_number_id', env('WHATSAPP_PHONE_NUMBER_ID'));
        $this->businessAccountId = config('services.whatsapp.business_account_id', env('WHATSAPP_BUSINESS_ACCOUNT_ID'));
        $this->apiVersion = config('services.whatsapp.api_version', env('WHATSAPP_API_VERSION', 'v21.0'));
        $this->templateName = config('services.whatsapp.template_name', env('WHATSAPP_OTP_TEMPLATE_NAME', 'authentication_otp'));
        $this->languageCode = config('services.whatsapp.language_code', env('WHATSAPP_LANGUAGE_CODE', 'en_US'));
    }

    /**
     * Send OTP via WhatsApp Cloud API or Mock mode.
     *
     * @param string $recipientPhone E.164 formatted phone number (e.g. +212600000000)
     * @param string $otp 6-digit numeric OTP
     * @return array
     * @throws Exception
     */
    public function sendOtp(string $recipientPhone, string $otp): array
    {
        // Free Development / Mock Mode
        if ($this->provider === 'mock') {
            Log::info("Mock WhatsApp Service: Dispatching OTP to {$recipientPhone}. (Development Mode)");

            return [
                'success' => true,
                'provider' => 'mock',
                'message' => 'OTP dispatched successfully via Mock provider.',
                'recipient' => $recipientPhone,
            ];
        }

        // Live WhatsApp Cloud API Integration
        if (empty($this->accessToken) || empty($this->phoneNumberId)) {
            Log::error('WhatsApp Cloud API configuration is incomplete: missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID.');
            throw new Exception('WhatsApp service is not properly configured on the server.');
        }

        // Meta WhatsApp Cloud API expects recipient numbers without the leading '+'
        $cleanPhone = ltrim($recipientPhone, '+');

        $url = "https://graph.facebook.com/{$this->apiVersion}/{$this->phoneNumberId}/messages";

        // Official Meta WhatsApp Authentication Template Payload with COPY_CODE button support
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $cleanPhone,
            'type' => 'template',
            'template' => [
                'name' => $this->templateName,
                'language' => [
                    'code' => $this->languageCode,
                ],
                'components' => [
                    [
                        'type' => 'body',
                        'parameters' => [
                            [
                                'type' => 'text',
                                'text' => $otp,
                            ],
                        ],
                    ],
                    [
                        'type' => 'button',
                        'sub_type' => 'url',
                        'index' => '0',
                        'parameters' => [
                            [
                                'type' => 'text',
                                'text' => $otp,
                            ],
                        ],
                    ],
                ],
            ],
        ];

        try {
            $response = Http::withToken($this->accessToken)
                ->timeout(12)
                ->acceptJson()
                ->post($url, $payload);

            if ($response->successful()) {
                $data = $response->json();
                Log::info("WhatsApp Cloud API successfully delivered OTP message to {$cleanPhone}.", [
                    'message_id' => $data['messages'][0]['id'] ?? null,
                ]);

                return [
                    'success' => true,
                    'provider' => 'whatsapp',
                    'message_id' => $data['messages'][0]['id'] ?? null,
                    'recipient' => $recipientPhone,
                ];
            }

            // Meta Cloud API returned an error
            $statusCode = $response->status();
            $errorJson = $response->json();
            $metaError = $errorJson['error'] ?? [];
            $metaErrorMessage = $metaError['message'] ?? 'Meta WhatsApp API request rejected.';
            $metaErrorCode = $metaError['code'] ?? $statusCode;

            Log::error("WhatsApp Cloud API rejected message delivery to {$cleanPhone}: [Code {$metaErrorCode}] {$metaErrorMessage}", [
                'response' => $errorJson,
            ]);

            throw new Exception("WhatsApp delivery failed: {$metaErrorMessage} (Error code: {$metaErrorCode})");
        } catch (Exception $e) {
            // Rethrow or wrap if not already an Exception
            Log::error("Exception in WhatsApp Cloud API communication: " . $e->getMessage());
            throw $e;
        }
    }
}
