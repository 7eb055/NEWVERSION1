// JWT Token Management Service
// Handles authentication state, token storage, and user session management

class AuthTokenService {
  // Token storage keys
  static TOKEN_KEY = 'authToken';
  static USER_KEY = 'user';
  static AUTH_KEY = 'isAuthenticated';
  static LOGIN_TIME_KEY = 'loginTime';

  // Store authentication data after successful login
  static setAuthData(token, user) {
    try {
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      localStorage.setItem(this.AUTH_KEY, 'true');
      localStorage.setItem(this.LOGIN_TIME_KEY, new Date().toISOString());
      
      console.log('✅ Auth data stored successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to store auth data:', error);
      return false;
    }
  }

  // Get stored JWT token
  static getToken() {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Get stored user data
  static getUser() {
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Check if user is authenticated
  static isAuthenticated() {
    try {
      const hasToken = !!this.getToken();
      const authFlag = localStorage.getItem(this.AUTH_KEY) === 'true';
      const hasUser = !!this.getUser();
      
      return hasToken && authFlag && hasUser && !this.isTokenExpired();
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  // Check if token is expired (basic check - you might want to decode JWT for precise expiration)
  static isTokenExpired() {
    try {
      const loginTime = localStorage.getItem(this.LOGIN_TIME_KEY);
      if (!loginTime) return true;
      
      const loginDate = new Date(loginTime);
      const now = new Date();
      const hoursSinceLogin = (now - loginDate) / (1000 * 60 * 60);
      
      // Assume token expires after 24 hours (adjust based on your JWT expiration)
      return hoursSinceLogin > 24;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  // Get user's primary role
  static getUserRole() {
    try {
      const user = this.getUser();
      if (!user) return null;

      // Check primary role first
      if (user.primary_role) {
        return user.primary_role;
      }

      // Fallback to roles array
      if (user.roles && user.roles.length > 0) {
        // Prioritize organizer role if user has multiple roles
        const organizerRole = user.roles.find(role => role.role === 'organizer');
        if (organizerRole) return 'organizer';
        
        return user.roles[0].role;
      }

      return 'attendee'; // default fallback
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  // Check if user has specific role
  static hasRole(roleToCheck) {
    try {
      const user = this.getUser();
      if (!user) return false;

      // Check primary role
      if (user.primary_role === roleToCheck) return true;

      // Check in roles array
      if (user.roles && user.roles.length > 0) {
        return user.roles.some(role => role.role === roleToCheck);
      }

      return false;
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }

  // Get appropriate dashboard route based on user role
  static getDashboardRoute() {
    const role = this.getUserRole();
    
    switch (role) {
      case 'organizer':
        return '/organizer-dashboard';
      case 'attendee':
        return '/attendee-dashboard';
      case 'admin':
        return '/admin-dashboard';
      default:
        return '/attendee-dashboard'; // default fallback
    }
  }

  // Get authorization header for API requests
  static getAuthHeader() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  
  // Get organizer ID for the current user (for event operations)
  static getOrganizerId() {
    try {
      const user = this.getUser();
      if (!user) return null;
      
      // Look for organizer role which might contain organizer_id
      if (user.roles && Array.isArray(user.roles)) {
        const organizerRole = user.roles.find(role => role.role === 'organizer');
        if (organizerRole && organizerRole.organizer_id) {
          return organizerRole.organizer_id;
        }
      }
      
      // Fallback: The user might have organizer_id directly in the user object
      return user.organizer_id || null;
    } catch (error) {
      console.error('Error getting organizer ID:', error);
      return null;
    }
  }

  // Clear all authentication data (logout)
  static clearAuthData() {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem(this.AUTH_KEY);
      localStorage.removeItem(this.LOGIN_TIME_KEY);
      
      console.log('✅ Auth data cleared successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear auth data:', error);
      return false;
    }
  }

  // Logout user and redirect to login
  static logout(navigate = null) {
    this.clearAuthData();
    
    if (navigate) {
      navigate('/login', { replace: true });
    } else {
      // Fallback to window location if navigate is not available
      window.location.href = '/login';
    }
  }

  // Refresh user data (useful after profile updates)
  static async refreshUserData(apiCall) {
    try {
      const token = this.getToken();
      if (!token) return false;

      const response = await apiCall({
        headers: this.getAuthHeader()
      });

      if (response.data && response.data.user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(response.data.user));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return false;
    }
  }

  // Auto-logout if token is expired
  static checkAndHandleExpiration(navigate = null) {
    if (this.isAuthenticated() && this.isTokenExpired()) {
      console.log('🔒 Token expired, logging out...');
      this.logout(navigate);
      return true; // Token was expired and user was logged out
    }
    return false; // Token is still valid
  }

  // Get user display name
  static getUserDisplayName() {
    try {
      const user = this.getUser();
      if (!user) return 'User';

      // Try to get name from roles
      if (user.roles && user.roles.length > 0) {
        const role = user.roles[0];
        if (role.full_name) return role.full_name;
      }

      // Fallback to email prefix
      if (user.email) {
        return user.email.split('@')[0];
      }

      return 'User';
    } catch (error) {
      console.error('Error getting user display name:', error);
      return 'User';
    }
  }

  // Get authentication summary for debugging
  static getAuthSummary() {
    return {
      isAuthenticated: this.isAuthenticated(),
      hasToken: !!this.getToken(),
      hasUser: !!this.getUser(),
      userRole: this.getUserRole(),
      isExpired: this.isTokenExpired(),
      loginTime: localStorage.getItem(this.LOGIN_TIME_KEY),
      userEmail: this.getUser()?.email,
      dashboardRoute: this.getDashboardRoute()
    };
  }
}

export default AuthTokenService;
