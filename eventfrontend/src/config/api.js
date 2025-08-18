/**
 * Global API Configuration
 * Single source of truth for all API URLs in the application
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

// Export the configured URLs
export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;

// For backward compatibility
export default API_BASE_URL;
