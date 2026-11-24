import axios, { AxiosError } from 'axios';
import type {
  OtpRequestPayload,
  OtpRequestResponse,
  OtpVerifyPayload,
  OtpVerifyResponse,
  OtpStatusResponse,
} from '../types/otp';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
});

export const otpApi = {
  async requestOtp(payload: OtpRequestPayload): Promise<OtpRequestResponse> {
    try {
      const response = await apiClient.post<OtpRequestResponse>('/otp/request', payload);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async verifyOtp(payload: OtpVerifyPayload): Promise<OtpVerifyResponse> {
    try {
      const response = await apiClient.post<OtpVerifyResponse>('/otp/verify', payload);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async resendOtp(payload: OtpRequestPayload): Promise<OtpRequestResponse> {
    try {
      const response = await apiClient.post<OtpRequestResponse>('/otp/resend', payload);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async getStatus(phone: string): Promise<OtpStatusResponse> {
    try {
      const response = await apiClient.get<OtpStatusResponse>('/otp/status', {
        params: { phone },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
  remaining_cooldown?: number;
  attempts_left?: number;
}

function handleApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<ApiErrorResponse>;
    if (axiosErr.response) {
      const data = axiosErr.response.data;
      if (data?.errors) {
        const firstKey = Object.keys(data.errors)[0];
        if (firstKey && data.errors[firstKey].length > 0) {
          return new Error(data.errors[firstKey][0]);
        }
      }
      return new Error(data?.message || `Server responded with status ${axiosErr.response.status}`);
    } else if (axiosErr.request) {
      return new Error('Network connection failed. Unable to reach the verification server.');
    }
  }
  return new Error(error instanceof Error ? error.message : 'An unexpected error occurred.');
}
