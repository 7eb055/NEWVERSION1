// Error handling utility for API responses
// Provides consistent error messages and handling across the application

export const getErrorMessage = (error, defaultMessage = 'An unexpected error occurred') => {
  // Handle network errors
  if (!error) {
    return defaultMessage;
  }

  // Handle HTTP response errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        return data?.message || 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Your session has expired. Please log in again.';
      case 403:
        return 'Access denied. You do not have permission to perform this action.';
      case 404:
        return data?.message || 'The requested resource was not found.';
      case 409:
        return data?.message || 'This action conflicts with existing data.';
      case 422:
        return data?.message || 'Invalid data provided. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later or contact support if the problem persists.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return data?.message || `Server returned error ${status}. Please try again.`;
    }
  }

  // Handle fetch API errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // Handle timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  // Handle custom error messages
  if (error.message) {
    // Handle specific error patterns
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return 'Access denied. Please make sure you are logged in properly.';
    }
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return 'Your session has expired. Please log in again.';
    }
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return 'The requested resource was not found.';
    }
    if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
      return 'Server error. Please try again later.';
    }
    
    return error.message;
  }

  return defaultMessage;
};

export const handleAuthError = (error) => {
  const errorMessage = getErrorMessage(error);
  
  // Check if it's an auth-related error
  if (errorMessage.includes('session has expired') || 
      errorMessage.includes('log in again') ||
      error.response?.status === 401) {
    // Clear tokens and redirect to login
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.location.href = '/login';
    return;
  }
  
  return errorMessage;
};

export const showNotification = (type, message) => {
  // This could be enhanced to use a toast library or custom notification system
  // For now, we'll use browser notifications
  console.log(`${type.toUpperCase()}: ${message}`);
  
  if (type === 'error') {
    alert(message);
  } else {
    // Could implement toast notifications here
    alert(message);
  }
};

export default {
  getErrorMessage,
  handleAuthError,
  showNotification
};
