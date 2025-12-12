import axios from 'axios';

// Use environment variable if set, otherwise use production URL
// For local development, create .env.local with: VITE_API_URL=http://localhost:8000/api
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://floor-tile-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error?.message || 'An error occurred';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

export default api;
