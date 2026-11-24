# WhatsApp OTP Verification Web Application

A modern, secure, and production-grade WhatsApp OTP phone verification solution built with **React (Vite + TypeScript + Native CSS)** and a **Laravel REST API** backed by the **Official Meta WhatsApp Business Cloud API**.

---

## 🌟 Features

- **Frontend:**
  - Modern, clean, minimal UI adhering to the specified design system (Deep Blue `#2563EB`, Dark Navy `#0F172A`, Green `#16A34A`, Red `#DC2626`).
  - Native CSS with custom design tokens, responsive layout (mobile, tablet, desktop), and smooth micro-animations.
  - Country selector with international dial codes (Default: Morocco `+212`).
  - Automatic number formatting and leading-zero normalization.
  - 6-digit OTP input with automatic focus advance, backspace handling, and full clipboard paste support.
  - Real-time 5-minute expiry countdown timer.
  - 60-second resend cooldown timer.
  - Loading indicators, granular error alerts, and successful verification views.
  - Dual Mode support: seamless local development mode (`dev_otp` display) and live WhatsApp delivery.

- **Backend:**
  - RESTful API endpoints: `/api/otp/request`, `/api/otp/verify`, `/api/otp/resend`, `/api/otp/status`.
  - Cryptographically secure 6-digit OTP generation using PHP `random_int`.
  - Secure one-way hashing with Laravel `Hash::make()` (Bcrypt). OTP is never stored in plaintext and never leaked in production responses.
  - Single-use codes with immediate invalidation upon successful verification or re-issuance.
  - Rate limiting (Throttle) against brute-force and spam on API routes.
  - Strict E.164 phone number normalization (`+212600000000`).
  - Configurable OTP provider: `mock` (free local development) or `whatsapp` (official Meta Cloud API).
  - Official Meta WhatsApp Authentication Template payload with one-click copy button support (`COPY_CODE`).

---

## 📁 Project Architecture

```
OTPC/
├── frontend/                     # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── icons/            # Radix icons + WhatsApp SVG icon
│   │   ├── constants/            # Supported countries list & formats
│   │   ├── pages/
│   │   │   ├── PhoneVerificationPage.tsx
│   │   │   ├── OtpVerificationPage.tsx
│   │   │   └── VerificationSuccessPage.tsx
│   │   ├── services/             # Centralized Axios API service & error handler
│   │   ├── types/                # Strict TypeScript contracts & payloads
│   │   ├── App.tsx               # React Router navigation
│   │   ├── index.css             # Native CSS design system & micro-interactions
│   │   └── main.tsx
│   ├── .env.example
│   └── package.json
│
├── backend/                      # Laravel REST API
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   └── OtpController.php
│   │   ├── Models/
│   │   │   └── PhoneVerification.php
│   │   └── Services/
│   │       ├── OtpService.php      # Business logic, throttling, hashing, validation
│   │       └── WhatsAppService.php # Meta Cloud API integration & Mock provider
│   ├── config/
│   │   ├── cors.php              # Full CORS permissions for frontend
│   │   └── services.php          # WhatsApp configuration
│   ├── database/migrations/
│   │   └── 2026_01_01_000001_create_phone_verifications_table.php
│   ├── routes/
│   │   └── api.php               # Rate-limited OTP endpoints
│   ├── tests/Feature/
│   │   └── OtpFlowTest.php       # Feature test suite (8 tests, 20 assertions)
│   ├── .env.example
│   └── composer.json
└── README.md
```

---

## 🚀 Quick Start & Local Development

### 1. Backend Setup

```bash
cd backend

# 1. Install dependencies (if not already done)
composer install

# 2. Configure environment
copy .env.example .env
php artisan key:generate

# 3. Run database migrations
php artisan migrate

# 4. Start Laravel Development Server
php artisan serve
# Server runs at http://127.0.0.1:8000
```

### 2. Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
copy .env.example .env
# VITE_API_BASE_URL=http://127.0.0.1:8000/api

# 3. Start Vite dev server
npm run dev
# Application accessible at http://localhost:5173
```

---

## 🧪 Testing Scenarios Covered

The automated test suite (`php artisan test --filter=OtpFlowTest`) validates:

1. **Valid Phone Number Request**: Successfully dispatches OTP, computes 60s cooldown, sets 5m expiry.
2. **Invalid Phone Number**: Fails normalization with a 400 Bad Request.
3. **Resend Cooldown**: Second request within 60s is rejected.
4. **Correct OTP**: Authenticates code, timestamps `verified_at`, invalidates code.
5. **Incorrect OTP**: Increments attempts, returns remaining attempts.
6. **Max Attempts Lockout**: Blocks verification after 5 failed attempts.
7. **Expired OTP**: Rejects verification after 5-minute expiration.
8. **Status Endpoint**: Accurately reflects pending, remaining cooldown, and verified states.

---

## 📡 API Reference & Postman Examples

### Base URL: `http://127.0.0.1:8000/api`

#### 1. Request OTP
- **POST** `/otp/request`
- **Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Body**:
  ```json
  {
    "phone": "+212612345678"
  }
  ```
- **Response (200 OK - Mock Mode)**:
  ```json
  {
    "success": true,
    "message": "Verification code sent successfully via WhatsApp.",
    "phone": "+212612345678",
    "cooldown_seconds": 60,
    "expires_in_seconds": 300,
    "dev_otp": "748291"
  }
  ```

#### 2. Verify OTP
- **POST** `/otp/verify`
- **Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Body**:
  ```json
  {
    "phone": "+212612345678",
    "otp": "748291"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Phone number verified successfully.",
    "verified_at": "2026-11-24T10:45:00+00:00"
  }
  ```

#### 3. Resend OTP
- **POST** `/otp/resend`
- **Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Body**:
  ```json
  {
    "phone": "+212612345678"
  }
  ```
- **Response (400 Bad Request if cooled down)**:
  ```json
  {
    "success": false,
    "message": "Please wait 42 seconds before requesting a new verification code."
  }
  ```

#### 4. Verification Status
- **GET** `/otp/status?phone=+212612345678`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "phone": "+212612345678",
    "status": "pending",
    "remaining_cooldown": 38,
    "remaining_expiry": 278,
    "attempts_left": 5
  }
  ```

---

## 💬 WhatsApp Cloud API Integration (Production)

To switch from Mock mode to Live WhatsApp delivery:

1. Create a Meta Developer App under **Business** type.
2. Add **WhatsApp Product** to your app.
3. Create an **Authentication Message Template** in WhatsApp Manager:
   - Template Category: **Authentication**
   - Name: `authentication_otp` (or your choice)
   - Add a 1-variable body (`{{1}}` is your verification code) and an optional `Copy Code` button.
4. Update your backend `.env`:
   ```dotenv
   OTP_PROVIDER=whatsapp
   WHATSAPP_ACCESS_TOKEN=EAAG...
   WHATSAPP_PHONE_NUMBER_ID=1092837465...
   WHATSAPP_BUSINESS_ACCOUNT_ID=981273491...
   WHATSAPP_API_VERSION=v21.0
   WHATSAPP_OTP_TEMPLATE_NAME=authentication_otp
   WHATSAPP_LANGUAGE_CODE=en_US
   ```
5. In production, ensure `APP_ENV=production` and `APP_DEBUG=false`. The application automatically suppresses `dev_otp`.

---

## 🛡️ Production Deployment Checklist

1. **MySQL Database**:
   Set `DB_CONNECTION=mysql`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` in `.env`.
2. **HTTPS & CORS**:
   Configure trusted SSL certificates on your web server (Nginx/Apache) and lock down `allowed_origins` in `backend/config/cors.php`.
3. **Frontend Build**:
   Run `npm run build` in `/frontend`. Serve the `/dist` directory via Nginx or Cloudflare Pages.
4. **Laravel Optimization**:
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```
#   O T P C  
 