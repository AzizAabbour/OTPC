<?php

use App\Http\Controllers\OtpController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('otp')->middleware(['throttle:30,1'])->group(function () {
    Route::post('/request', [OtpController::class, 'requestOtp'])->middleware('throttle:6,1');
    Route::post('/verify', [OtpController::class, 'verifyOtp'])->middleware('throttle:10,1');
    Route::post('/resend', [OtpController::class, 'resendOtp'])->middleware('throttle:6,1');
    Route::get('/status', [OtpController::class, 'status'])->middleware('throttle:30,1');
});
