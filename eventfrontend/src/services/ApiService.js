// API Service with JWT Token Management
// Automatically includes JWT tokens in API requests and handles token expiration

import axios from 'axios';
import AuthTokenService from './AuthTokenService';

class ApiService {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.axiosInstance = this.createAxiosInstance();
  }

  // Create axios instance with interceptors
  createAxiosInstance() {
    const instance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // 10 seconds timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor - automatically add JWT token
    instance.interceptors.request.use(
      (config) => {
        const token = AuthTokenService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle token expiration
    instance.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`);
        
        // Handle authentication errors
        if (error.response?.status === 401) {
          console.log('🔒 Unauthorized request - clearing auth data');
          AuthTokenService.clearAuthData();
          
          // Redirect to login if not already there
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(error);
      }
    );

    return instance;
  }

  // Authentication API methods
  async login(email, password) {
    try {
      const response = await this.axiosInstance.post('/api/auth/login', {
        email,
        password
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
        status: error.response?.status
      };
    }
  }

  async register(userData) {
    try {
      const response = await this.axiosInstance.post('/api/auth/register', userData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed',
        errors: error.response?.data?.errors || [],
        status: error.response?.status
      };
    }
  }

  async verifyEmail(token) {
    try {
      const response = await this.axiosInstance.get(`/api/auth/verify-email?token=${token}`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Email verification failed',
        status: error.response?.status
      };
    }
  }

  async resendVerification(email) {
    try {
      const response = await this.axiosInstance.post('/api/auth/resend-verification', {
        email
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to resend verification email',
        status: error.response?.status
      };
    }
  }

  async forgotPassword(email) {
    try {
      const response = await this.axiosInstance.post('/api/auth/forgot-password', {
        email
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Password reset request failed',
        status: error.response?.status
      };
    }
  }

  async resetPassword(token, newPassword) {
    try {
      const response = await this.axiosInstance.post('/api/auth/reset-password', {
        token,
        newPassword
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Password reset failed',
        status: error.response?.status
      };
    }
  }

  // Protected API methods (require authentication)
  async getUserProfile() {
    try {
      const response = await this.axiosInstance.get('/api/auth/profile');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get user profile',
        status: error.response?.status
      };
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await this.axiosInstance.put('/api/auth/profile', profileData);
      
      // Update stored user data if successful
      if (response.data.user) {
        const currentUser = AuthTokenService.getUser();
        const updatedUser = { ...currentUser, ...response.data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update profile',
        status: error.response?.status
      };
    }
  }

  // Event-related API methods (examples for future use)
  async getEvents(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = params ? `/api/events?${params}` : '/api/events';
      
      const response = await this.axiosInstance.get(url);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get events',
        status: error.response?.status
      };
    }
  }

  async createEvent(eventData) {
    try {
      const response = await this.axiosInstance.post('/api/events', eventData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create event',
        status: error.response?.status
      };
    }
  }

  // Generic API method for custom requests
  async makeRequest(method, url, data = null, config = {}) {
    try {
      const response = await this.axiosInstance({
        method,
        url,
        data,
        ...config
      });
      
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'API request failed',
        status: error.response?.status,
        details: error.response?.data
      };
    }
  }

  // Health check
  async checkHealth() {
    try {
      const response = await this.axiosInstance.get('/api/auth/health');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: 'API health check failed',
        status: error.response?.status
      };
    }
  }

  // Get API base URL
  getBaseURL() {
    return this.baseURL;
  }

  // Update base URL if needed
  setBaseURL(newBaseURL) {
    this.baseURL = newBaseURL;
    this.axiosInstance.defaults.baseURL = newBaseURL;
  }
}

// Create and export a singleton instance
const apiService = new ApiService();

export default apiService;
