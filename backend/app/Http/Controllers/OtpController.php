<?php

namespace App\Http\Controllers;

use App\Services\OtpService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OtpController extends Controller
{
    protected OtpService $otpService;

    public function __construct(OtpService $otpService)
    {
        $this->otpService = $otpService;
    }

    /**
     * Request a new WhatsApp OTP.
     * POST /api/otp/request
     */
    public function requestOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone' => ['required', 'string', 'max:25'],
        ], [
            'phone.required' => 'The phone number field is required.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->otpService->requestOtp($request->input('phone'), false);
            return response()->json($result, 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Verify submitted 6-digit OTP.
     * POST /api/otp/verify
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone' => ['required', 'string', 'max:25'],
            'otp' => ['required', 'string', 'regex:/^\d{6}$/'],
        ], [
            'phone.required' => 'The phone number is required.',
            'otp.required' => 'The OTP code is required.',
            'otp.regex' => 'The OTP code must consist of exactly 6 digits.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->otpService->verifyOtp(
                $request->input('phone'),
                $request->input('otp')
            );
            return response()->json($result, 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Resend WhatsApp OTP (subject to 60s cooldown).
     * POST /api/otp/resend
     */
    public function resendOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'phone' => ['required', 'string', 'max:25'],
        ], [
            'phone.required' => 'The phone number is required.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->otpService->requestOtp($request->input('phone'), true);
            return response()->json($result, 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Check current OTP status for a phone.
     * GET /api/otp/status?phone=+212600000000
     */
    public function status(Request $request): JsonResponse
    {
        $phone = $request->query('phone');

        if (!$phone) {
            return response()->json([
                'success' => false,
                'message' => 'The phone query parameter is required.',
            ], 422);
        }

        $result = $this->otpService->getStatus($phone);
        return response()->json($result, 200);
    }
}
