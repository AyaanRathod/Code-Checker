import apiClient from '../lib/apiClient';
import type { AuthUser, TokenResponse } from '../types/auth';

// ---------------------------------------------------------------------------
// Local register
// ---------------------------------------------------------------------------

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  title?: string;
  department?: string;
  email: string;
  password: string;
}

export const registerApi = async (payload: RegisterPayload): Promise<TokenResponse> => {
  const res = await apiClient.post<TokenResponse>('/auth/register', payload);
  return res.data;
};

// ---------------------------------------------------------------------------
// Local login
// ---------------------------------------------------------------------------

export const loginApi = async (email: string, password: string): Promise<TokenResponse> => {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);
  const res = await apiClient.post<TokenResponse>('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
};

// ---------------------------------------------------------------------------
// Google Sign-In
// ---------------------------------------------------------------------------

export const googleAuthApi = async (credential: string): Promise<TokenResponse> => {
  const res = await apiClient.post<TokenResponse>('/auth/google', { credential });
  return res.data;
};

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------

export const getMeApi = async (token: string): Promise<AuthUser> => {
  const res = await apiClient.get<AuthUser>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const updateMeApi = async (
  token: string,
  payload: {
    first_name?: string;
    last_name?: string;
    title?: string;
    department?: string;
    username?: string;
  }
): Promise<AuthUser> => {
  const res = await apiClient.put<AuthUser>('/auth/me', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const changePasswordApi = async (
  token: string,
  current_password: string,
  new_password: string
): Promise<void> => {
  await apiClient.post(
    '/auth/change-password',
    { current_password, new_password },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};
