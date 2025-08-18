/**
 * API Configuration Utility
 * Handles environment-aware API URL detection and configuration
 */

/**
 * Get the appropriate API base URL based on environment
 * Priority:
 * 1. Heroku/Production environment variable (VITE_API_URL)
 * 2. Check if online (can reach production server)
 * 3. Fallback to localhost for development
 */
const getApiBaseUrl = () => {
  // First check if we have an explicit environment variable
  const envApiUrl = import.meta.env.VITE_API_URL;
  
  if (envApiUrl) {
    // If VITE_API_URL is set, use it (production/staging)
    return envApiUrl.endsWith('/api') ? envApiUrl.slice(0, -4) : envApiUrl;
  }
  
  // For development, try to detect if we're online
  // If we can't reach the production server, use localhost
  const isLocalDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             window.location.hostname === '';
  
  if (isLocalDevelopment) {
    return 'http://localhost:5001';
  }
  
  // If we're on a deployed frontend but no VITE_API_URL is set,
  // assume the backend is on the same origin
  return window.location.origin;
};

/**
 * Get the full API URL with /api suffix
 */
const getApiUrl = () => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/api`;
};

/**
 * Check if we're in development mode
 */
const isDevelopment = () => {
  return import.meta.env.DEV || 
         window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1';
};

/**
 * Check if we're in production mode
 */
const isProduction = () => {
  return import.meta.env.PROD && !isDevelopment();
};

/**
 * Get environment info for debugging
 */
const getEnvironmentInfo = () => {
  return {
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    hostname: window.location.hostname,
    origin: window.location.origin,
    viteApiUrl: import.meta.env.VITE_API_URL,
    apiBaseUrl: getApiBaseUrl(),
    apiUrl: getApiUrl()
  };
};

export {
  getApiBaseUrl,
  getApiUrl,
  isDevelopment,
  isProduction,
  getEnvironmentInfo
};

export default {
  getApiBaseUrl,
  getApiUrl,
  isDevelopment,
  isProduction,
  getEnvironmentInfo
};
