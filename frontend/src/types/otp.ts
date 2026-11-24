export interface OtpRequestPayload {
  phone: string;
}

export interface OtpRequestResponse {
  success: boolean;
  message: string;
  cooldown_seconds?: number;
  expires_in_seconds?: number;
  // Local development aid when OTP_PROVIDER=mock
  dev_otp?: string;
}

export interface OtpVerifyPayload {
  phone: string;
  otp: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  message: string;
  verified_at?: string;
}

export interface OtpStatusResponse {
  success: boolean;
  phone?: string;
  status: 'unverified' | 'pending' | 'verified' | 'expired' | 'locked';
  remaining_cooldown?: number;
  remaining_expiry?: number;
  attempts_left?: number;
}
