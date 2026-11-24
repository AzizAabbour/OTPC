import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckIcon, ArrowRightIcon } from '@radix-ui/react-icons';

interface SuccessState {
  phone?: string;
  verifiedAt?: string;
}

export const VerificationSuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as SuccessState) || {};
  const phone = state.phone || '+212 600-000000';

  const handleStartAgain = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="card success-card">
      <div className="success-badge-wrapper">
        <CheckIcon className="success-icon" />
      </div>

      <h1 className="card-title">Verification Successful</h1>
      <p className="card-subtitle" style={{ marginBottom: '20px' }}>
        Your phone number has been authenticated through WhatsApp.
      </p>

      <div>
        <div className="verified-pill">
          <span className="check-dot" />
          <span>{phone}</span>
        </div>
      </div>

      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '28px' }}>
        Your identity is verified. You can now proceed to your account or start a new verification flow.
      </p>

      <button onClick={handleStartAgain} className="btn btn-primary">
        <span>Start Again</span>
        <ArrowRightIcon width={16} height={16} />
      </button>
    </div>
  );
};
