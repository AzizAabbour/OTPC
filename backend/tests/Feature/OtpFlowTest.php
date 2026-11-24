<?php

namespace Tests\Feature;

use App\Models\PhoneVerification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class OtpFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.whatsapp.provider' => 'mock']);
    }

    public function test_valid_phone_number_can_request_otp(): void
    {
        $response = $this->postJson('/api/otp/request', [
            'phone' => '+212612345678',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'phone' => '+212612345678',
                'cooldown_seconds' => 60,
            ])
            ->assertJsonStructure(['dev_otp']);

        $this->assertDatabaseHas('phone_verifications', [
            'phone' => '+212612345678',
            'attempts' => 0,
        ]);
    }

    public function test_invalid_phone_number_fails(): void
    {
        $response = $this->postJson('/api/otp/request', [
            'phone' => '123',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_resend_cooldown_is_enforced(): void
    {
        $this->postJson('/api/otp/request', ['phone' => '+212612345678']);

        $resendResponse = $this->postJson('/api/otp/resend', [
            'phone' => '+212612345678',
        ]);

        $resendResponse->assertStatus(400)
            ->assertJsonFragment([
                'success' => false,
            ]);
    }

    public function test_verification_with_correct_otp(): void
    {
        $req = $this->postJson('/api/otp/request', ['phone' => '+212612345678']);
        $otp = $req->json('dev_otp');

        $verifyResponse = $this->postJson('/api/otp/verify', [
            'phone' => '+212612345678',
            'otp' => $otp,
        ]);

        $verifyResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Phone number verified successfully.',
            ]);

        $this->assertDatabaseMissing('phone_verifications', [
            'phone' => '+212612345678',
            'verified_at' => null,
        ]);
    }

    public function test_verification_with_incorrect_otp(): void
    {
        $this->postJson('/api/otp/request', ['phone' => '+212612345678']);

        $verifyResponse = $this->postJson('/api/otp/verify', [
            'phone' => '+212612345678',
            'otp' => '000000',
        ]);

        $verifyResponse->assertStatus(400)
            ->assertJson([
                'success' => false,
            ]);

        $this->assertDatabaseHas('phone_verifications', [
            'phone' => '+212612345678',
            'attempts' => 1,
        ]);
    }

    public function test_max_attempts_lockout(): void
    {
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);

        $this->postJson('/api/otp/request', ['phone' => '+212612345678']);

        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/api/otp/verify', [
                'phone' => '+212612345678',
                'otp' => '99999' . $i,
            ]);
        }

        // 6th attempt should report lockout
        $sixthAttempt = $this->postJson('/api/otp/verify', [
            'phone' => '+212612345678',
            'otp' => '123456',
        ]);

        $sixthAttempt->assertStatus(400)
            ->assertJsonFragment([
                'success' => false,
            ]);
    }

    public function test_expired_otp_is_rejected(): void
    {
        $this->postJson('/api/otp/request', ['phone' => '+212612345678']);

        // Manually expire record
        PhoneVerification::where('phone', '+212612345678')
            ->update(['expires_at' => now()->subMinutes(10)]);

        $verifyResponse = $this->postJson('/api/otp/verify', [
            'phone' => '+212612345678',
            'otp' => '123456',
        ]);

        $verifyResponse->assertStatus(400)
            ->assertJsonFragment([
                'message' => 'The verification code has expired. Please request a new one.',
            ]);
    }

    public function test_status_endpoint(): void
    {
        $this->postJson('/api/otp/request', ['phone' => '+212612345678']);

        $statusResponse = $this->getJson('/api/otp/status?phone=+212612345678');
        $statusResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'status' => 'pending',
                'phone' => '+212612345678',
            ]);
    }
}
