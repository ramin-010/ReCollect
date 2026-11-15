// lib/utils/axios.ts
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8002',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;

        // A published doc's page (/p/<slug>) is for anyone: a stale login there must not leave the page.
        // An app's sign-in (/oauth/consent) sends him to the login itself and back, with its request kept.
        if (!path.startsWith('/welcome') && !path.startsWith('/login') && !path.startsWith('/signup') && !path.startsWith('/p/') && !path.startsWith('/oauth/')) {
          window.location.href = '/welcome';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;