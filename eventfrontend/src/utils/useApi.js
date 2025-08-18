import { getApiBaseUrl, getApiUrl } from './apiConfig';

/**
 * React Hook for API configuration
 * Provides easy access to API URLs in React components
 */
export const useApi = () => {
  const apiBaseUrl = getApiBaseUrl();
  const apiUrl = getApiUrl();

  return {
    baseUrl: apiBaseUrl,
    apiUrl: apiUrl,
    // Helper method to build API endpoint URLs
    endpoint: (path) => {
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return `${apiUrl}/${cleanPath}`;
    }
  };
};

export default useApi;
