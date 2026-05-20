import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:4000',
  timeout: 15000, // 15s timeout for slow connections
});

// Add interceptor to log errors for debugging
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error (no response from server)
      console.error('Network error - no response from backend:', {
        message: error.message,
        code: error.code,
        config: error.config?.url,
      });
    }
    return Promise.reject(error);
  }
);

export default client;
