import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WhatsAppIcon } from '../components/icons/WhatsAppIcon';
import {
  ClockIcon,
  ReloadIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
} from '@radix-ui/react-icons';
import { otpApi } from '../services/api';

interface LocationState {
  phone?: string;
  cooldownSeconds?: number;
  devOtp?: string;
}

export const OtpVerificationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as LocationState) || {};
  const phone = state.phone;

  // Mask phone number: e.g. +212600000000 -> +212 60 ••• •000
  const maskPhoneNumber = (rawPhone?: string): string => {
    if (!rawPhone) return '';
    if (rawPhone.length <= 6) return rawPhone;
    const start = rawPhone.slice(0, 6);
    const end = rawPhone.slice(-3);
    return `${start} ••• •${end}`;
  };

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [expirySeconds, setExpirySeconds] = useState<number>(300); // 5 minutes
  const [cooldown, setCooldown] = useState<number>(state.cooldownSeconds ?? 60);
  const [devOtp, setDevOtp] = useState<string | undefined>(state.devOtp);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Redirect if no phone number in state
  useEffect(() => {
    if (!phone) {
      navigate('/', { replace: true });
    }
  }, [phone, navigate]);

  // Expiry Timer (5 minutes)
  useEffect(() => {
    if (expirySeconds <= 0) return;
    const timer = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [expirySeconds]);

  // Resend Cooldown Timer (60s)
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    setErrorMessage(null);
    const cleanVal = value.replace(/\D/g, '');

    // Handle single character or paste into single box
    if (cleanVal.length > 1) {
      handlePastedCode(cleanVal);
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = cleanVal;
    setDigits(nextDigits);

    // Auto-advance
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePastedCode = (pasted: string) => {
    const clean = pasted.replace(/\D/g, '').slice(0, 6);
    if (!clean) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < clean.length; i++) {
      newDigits[i] = clean[i];
    }
    setDigits(newDigits);

    const focusIndex = Math.min(clean.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handlePasteEvent = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    handlePastedCode(pasted);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone) return;

    const otpCode = digits.join('');
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    if (expirySeconds <= 0) {
      setErrorMessage('This code has expired. Please request a new one.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await otpApi.verifyOtp({ phone, otp: otpCode });
      if (response.success) {
        navigate('/success', {
          replace: true,
          state: {
            phone,
            verifiedAt: response.verified_at || new Date().toISOString(),
          },
        });
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !phone || isResending) return;

    setIsResending(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const response = await otpApi.resendOtp({ phone });
      setSuccessInfo('A new verification code has been dispatched to your WhatsApp.');
      setCooldown(response.cooldown_seconds || 60);
      setExpirySeconds(300); // Reset expiry to 5 minutes
      setDigits(['', '', '', '', '', '']);
      if (response.dev_otp) {
        setDevOtp(response.dev_otp);
      }
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not resend OTP. Try again shortly.');
    } finally {
      setIsResending(false);
    }
  };

  const handleChangePhone = () => {
    navigate('/');
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon-badge">
          <WhatsAppIcon size={32} />
        </div>
        <h1 className="card-title">Enter Verification Code</h1>
        <p className="card-subtitle">
          We sent a 6-digit security code via WhatsApp to <br />
          <strong>{maskPhoneNumber(phone)}</strong>
        </p>
      </div>

      {devOtp && (
        <div className="dev-otp-banner">
          <span>🛠️ Mock Dev OTP:</span>
          <span className="dev-otp-code">{devOtp}</span>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error">
          <ExclamationTriangleIcon width={18} height={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successInfo && (
        <div className="alert alert-success">
          <CheckCircledIcon width={18} height={18} />
          <span>{successInfo}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="otp-inputs-wrapper" onPaste={handlePasteEvent}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputRefs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`otp-digit ${digit ? 'filled' : ''}`}
              disabled={isLoading || expirySeconds <= 0}
              autoFocus={idx === 0}
              aria-label={`Digit ${idx + 1}`}
            />
          ))}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading || digits.join('').length !== 6 || expirySeconds <= 0}
        >
          {isLoading ? (
            <>
              <ReloadIcon className="spinner" width={16} height={16} />
              <span>Verifying Code...</span>
            </>
          ) : (
            <span>Verify & Continue</span>
          )}
        </button>

        <div className="otp-meta-section">
          <div className="otp-timer-info">
            <ClockIcon width={16} height={16} />
            <span>Code expires in:</span>
            <span className="timer-countdown">{formatTimer(expirySeconds)}</span>
          </div>

          <div className="otp-actions">
            <button
              type="button"
              className="link-button"
              onClick={handleChangePhone}
              disabled={isLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeftIcon width={14} height={14} />
              <span>Change Number</span>
            </button>

            <button
              type="button"
              className="link-button"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending || isLoading}
            >
              {isResending ? (
                'Resending...'
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                'Resend WhatsApp Code'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
