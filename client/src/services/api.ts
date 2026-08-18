import axios from 'axios';

function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    if (pathname.startsWith('/epr') || pathname.includes('/epr/')) {
      return '/epr';
    }
  }
  
  return '';
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
});

export default api;
