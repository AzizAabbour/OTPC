<?php

namespace App\Services;

use App\Models\PhoneVerification;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class OtpService
{
    public const OTP_EXPIRY_MINUTES = 5;
    public const RESEND_COOLDOWN_SECONDS = 60;
    public const MAX_ATTEMPTS = 5;

    protected WhatsAppService $whatsAppService;

    public function __construct(WhatsAppService $whatsAppService)
    {
        $this->whatsAppService = $whatsAppService;
    }

    /**
     * Normalize phone number to strict E.164 format (+[country][national_number]).
     *
     * @param string $phone
     * @return string
     * @throws Exception
     */
    public function normalizePhone(string $phone): string
    {
        // Strip whitespace, hyphens, and parenthesis
        $clean = preg_replace('/[\s\-\(\)]+/', '', $phone);

        // Ensure starts with +
        if (!str_starts_with($clean, '+')) {
            $clean = '+' . $clean;
        }

        // Validate strictly: + followed by 8 to 15 digits
        if (!preg_match('/^\+[1-9]\d{7,14}$/', $clean)) {
            throw new Exception('The provided phone number is not a valid international E.164 phone number.');
        }

        return $clean;
    }

    /**
     * Generate cryptographically secure 6-digit random OTP.
     *
     * @return string
     */
    public function generateOtp(): string
    {
        // 100000 to 999999 ensures exact 6 numeric digits
        return (string) random_int(100000, 999999);
    }

    /**
     * Request a new OTP for the phone number.
     * Invalidates prior active codes and respects resend cooldown.
     *
     * @param string $rawPhone
     * @param bool $isResend
     * @return array
     * @throws Exception
     */
    public function requestOtp(string $rawPhone, bool $isResend = false): array
    {
        $phone = $this->normalizePhone($rawPhone);

        // Check if there is an existing recent record for cooldown check
        $latest = PhoneVerification::where('phone', $phone)
            ->latest('id')
            ->first();

        if ($latest) {
            $secondsSinceCreation = Carbon::now()->diffInSeconds($latest->created_at);
            if ($secondsSinceCreation < self::RESEND_COOLDOWN_SECONDS) {
                $remainingCooldown = self::RESEND_COOLDOWN_SECONDS - $secondsSinceCreation;
                throw new Exception("Please wait {$remainingCooldown} seconds before requesting a new verification code.");
            }
        }

        // Generate secure 6-digit code
        $otp = $this->generateOtp();
        $otpHash = Hash::make($otp);
        $expiresAt = Carbon::now()->addMinutes(self::OTP_EXPIRY_MINUTES);

        // Send OTP via WhatsApp Service first (if Meta rejects, we do not report success)
        $deliveryResult = $this->whatsAppService->sendOtp($phone, $otp);

        // Invalidate prior codes by setting expires_at to past
        PhoneVerification::where('phone', $phone)
            ->whereNull('verified_at')
            ->where('expires_at', '>', Carbon::now())
            ->update(['expires_at' => Carbon::now()->subSecond()]);

        // Create new record
        $verification = PhoneVerification::create([
            'phone' => $phone,
            'otp_hash' => $otpHash,
            'expires_at' => $expiresAt,
            'attempts' => 0,
            'verified_at' => null,
        ]);

        $response = [
            'success' => true,
            'message' => 'Verification code sent successfully via WhatsApp.',
            'phone' => $phone,
            'cooldown_seconds' => self::RESEND_COOLDOWN_SECONDS,
            'expires_in_seconds' => self::OTP_EXPIRY_MINUTES * 60,
        ];

        // Include dev_otp ONLY when in local development environment AND provider is mock
        if (app()->environment('local', 'testing') && env('OTP_PROVIDER', 'mock') === 'mock') {
            $response['dev_otp'] = $otp;
        }

        return $response;
    }

    /**
     * Verify submitted OTP against stored hash.
     *
     * @param string $rawPhone
     * @param string $submittedOtp
     * @return array
     * @throws Exception
     */
    public function verifyOtp(string $rawPhone, string $submittedOtp): array
    {
        $phone = $this->normalizePhone($rawPhone);
        $cleanOtp = trim($submittedOtp);

        if (!preg_match('/^\d{6}$/', $cleanOtp)) {
            throw new Exception('The verification code must be a 6-digit number.');
        }

        $verification = PhoneVerification::where('phone', $phone)
            ->latest('id')
            ->first();

        if (!$verification) {
            throw new Exception('No verification request found for this phone number. Please request a new code.');
        }

        if ($verification->isVerified()) {
            return [
                'success' => true,
                'message' => 'Phone number has already been verified.',
                'verified_at' => $verification->verified_at->toIso8601String(),
            ];
        }

        if ($verification->hasExceededMaxAttempts(self::MAX_ATTEMPTS)) {
            throw new Exception('Too many failed verification attempts. Please request a new code.');
        }

        if ($verification->isExpired()) {
            throw new Exception('The verification code has expired. Please request a new one.');
        }

        // Increment attempts count
        $verification->increment('attempts');

        // Check hash
        if (!Hash::check($cleanOtp, $verification->otp_hash)) {
            $remaining = self::MAX_ATTEMPTS - $verification->attempts;
            if ($remaining > 0) {
                throw new Exception("Incorrect verification code. You have {$remaining} attempt(s) remaining.");
            } else {
                throw new Exception('Too many failed verification attempts. Your code has been invalidated.');
            }
        }

        // Single-use: Mark verified
        $verification->update([
            'verified_at' => Carbon::now(),
        ]);

        return [
            'success' => true,
            'message' => 'Phone number verified successfully.',
            'verified_at' => $verification->verified_at->toIso8601String(),
        ];
    }

    /**
     * Check verification status of a phone number.
     *
     * @param string $rawPhone
     * @return array
     */
    public function getStatus(string $rawPhone): array
    {
        try {
            $phone = $this->normalizePhone($rawPhone);
        } catch (Exception $e) {
            return [
                'success' => false,
                'status' => 'invalid_phone',
                'message' => $e->getMessage(),
            ];
        }

        $verification = PhoneVerification::where('phone', $phone)
            ->latest('id')
            ->first();

        if (!$verification) {
            return [
                'success' => true,
                'phone' => $phone,
                'status' => 'unverified',
                'message' => 'No active verification record found.',
            ];
        }

        if ($verification->isVerified()) {
            return [
                'success' => true,
                'phone' => $phone,
                'status' => 'verified',
                'verified_at' => $verification->verified_at->toIso8601String(),
            ];
        }

        if ($verification->hasExceededMaxAttempts(self::MAX_ATTEMPTS)) {
            return [
                'success' => true,
                'phone' => $phone,
                'status' => 'locked',
                'attempts_left' => 0,
            ];
        }

        if ($verification->isExpired()) {
            return [
                'success' => true,
                'phone' => $phone,
                'status' => 'expired',
            ];
        }

        $secondsSinceCreation = Carbon::now()->diffInSeconds($verification->created_at);
        $cooldown = max(0, self::RESEND_COOLDOWN_SECONDS - $secondsSinceCreation);
        $remainingExpiry = max(0, Carbon::now()->diffInSeconds($verification->expires_at, false));

        return [
            'success' => true,
            'phone' => $phone,
            'status' => 'pending',
            'remaining_cooldown' => $cooldown,
            'remaining_expiry' => $remainingExpiry,
            'attempts_left' => max(0, self::MAX_ATTEMPTS - $verification->attempts),
        ];
    }
}
