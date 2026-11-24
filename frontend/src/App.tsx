import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PhoneVerificationPage } from './pages/PhoneVerificationPage';
import { OtpVerificationPage } from './pages/OtpVerificationPage';
import { VerificationSuccessPage } from './pages/VerificationSuccessPage';
import { WhatsAppIcon } from './components/icons/WhatsAppIcon';
import './index.css';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-container">
        <div className="brand-header">
          <div className="brand-icon-box">
            <WhatsAppIcon size={18} color="#2563eb" />
          </div>
          <span className="brand-title">SecureAuth</span>
          <span className="brand-badge">WhatsApp OTP</span>
        </div>

        <Routes>
          <Route path="/" element={<PhoneVerificationPage />} />
          <Route path="/verify" element={<OtpVerificationPage />} />
          <Route path="/success" element={<VerificationSuccessPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
