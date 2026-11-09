import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const getBaseUrl = () => {
  if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
    throw new Error('CRITICAL: VITE_API_URL is missing in production environment');
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
};

const axiosInstance = axios.create({
  baseURL: getBaseUrl(),
});

// Add a request interceptor to include JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const originalRequest = error.config;
      // Skip redirect if this is the login request itself
      if (originalRequest && !originalRequest.url.includes('/login') && !originalRequest.url.includes('/signin') && !originalRequest.url.includes('/signup')) {
        // Handle unauthorized by using Zustand store to trigger React Router navigation smoothly
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
