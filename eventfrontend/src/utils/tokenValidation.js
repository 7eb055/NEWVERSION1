// Token validation utility
export const validateToken = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No token found');
    return false;
  }
  
  try {
    // Basic JWT structure validation
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid token format');
      return false;
    }
    
    // Decode payload (without verification for client-side check)
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token is expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.error('Token expired');
      return false;
    }
    
    console.log('Token appears valid for user:', payload.user_id);
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

// Clear invalid tokens
export const clearInvalidToken = () => {
  if (!validateToken()) {
    localStorage.removeItem('token');
    console.log('Invalid token removed');
    return true;
  }
  return false;
};

export const getValidToken = () => {
  const token = localStorage.getItem('token');
  return validateToken() ? token : null;
};
