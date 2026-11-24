import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COUNTRIES, type Country } from '../constants/countries';
import { WhatsAppIcon } from '../components/icons/WhatsAppIcon';
import {
  ChevronDownIcon,
  ReloadIcon,
  InfoCircledIcon,
  ExclamationTriangleIcon,
} from '@radix-ui/react-icons';
import { otpApi } from '../services/api';

export const PhoneVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRIES.find((c) => c.code === 'MA') || COUNTRIES[0]
  );
  const [nationalNumber, setNationalNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = COUNTRIES.find((c) => c.code === e.target.value);
    if (found) {
      setSelectedCountry(found);
      setErrorMessage(null);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/[^\d\s]/g, '');
    setNationalNumber(clean);
    if (errorMessage) setErrorMessage(null);
  };

  const getFullE164Phone = (): string => {
    const digitsOnly = nationalNumber.replace(/\D/g, '');
    const trimmedDigits = digitsOnly.startsWith('0') ? digitsOnly.slice(1) : digitsOnly;
    return `${selectedCountry.dialCode}${trimmedDigits}`;
  };

  const validatePhone = (): boolean => {
    const digitsOnly = nationalNumber.replace(/\D/g, '');
    const trimmedDigits = digitsOnly.startsWith('0') ? digitsOnly.slice(1) : digitsOnly;

    if (!trimmedDigits) {
      setErrorMessage('Please enter your phone number.');
      return false;
    }

    if (
      trimmedDigits.length < selectedCountry.minLength ||
      trimmedDigits.length > selectedCountry.maxLength
    ) {
      setErrorMessage(
        `For ${selectedCountry.name}, enter a valid ${selectedCountry.minLength}-digit phone number.`
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validatePhone()) {
      return;
    }

    const fullPhone = getFullE164Phone();
    setIsLoading(true);

    try {
      const response = await otpApi.requestOtp({ phone: fullPhone });
      navigate('/verify', {
        state: {
          phone: fullPhone,
          cooldownSeconds: response.cooldown_seconds || 60,
          devOtp: response.dev_otp,
        },
      });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send WhatsApp OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon-badge">
          <WhatsAppIcon size={34} />
        </div>
        <h1 className="card-title">WhatsApp Verification</h1>
        <p className="card-subtitle">
          Enter your phone number to receive a 6-digit authentication code directly on WhatsApp.
        </p>
      </div>

      {errorMessage && (
        <div className="alert alert-error">
          <ExclamationTriangleIcon width={18} height={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="phone-input">
            Phone Number
          </label>
          <div className={`phone-input-group ${errorMessage ? 'has-error' : ''}`}>
            <div className="country-select-wrapper" title="Change country code">
              <span className="country-flag">{selectedCountry.flag}</span>
              <span className="country-code-label">{selectedCountry.dialCode}</span>
              <ChevronDownIcon className="country-select-chevron" width={14} height={14} />

              <select
                id="country-select"
                aria-label="Select Country Code"
                value={selectedCountry.code}
                onChange={handleCountryChange}
                className="country-select"
                disabled={isLoading}
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name} ({country.dialCode})
                  </option>
                ))}
              </select>
            </div>

            <input
              id="phone-input"
              type="tel"
              value={nationalNumber}
              onChange={handleNumberChange}
              placeholder={selectedCountry.formatPlaceholder}
              className="phone-input"
              disabled={isLoading}
              autoFocus
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="notice-banner">
          <div className="notice-icon-box">
            <InfoCircledIcon width={14} height={14} color="#16a34a" />
          </div>
          <div className="notice-text">
            <strong>Official WhatsApp Delivery:</strong> We will send a secure verification code through our verified WhatsApp channel. Standard carrier rates may apply.
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? (
            <>
              <ReloadIcon className="spinner" width={16} height={16} />
              <span>Sending Code...</span>
            </>
          ) : (
            <span>Send Verification Code</span>
          )}
        </button>
      </form>
    </div>
  );
};
