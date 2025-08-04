// Protected Route Component
// Ensures only authenticated users can access certain routes

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AuthTokenService from '../services/AuthTokenService';
import './css/ProtectedRoute.css';

export const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  fallbackRoute = '/login',
  showLoading = true 
}) => {
  const [isChecking, setIsChecking] = useState(true);
  const [authStatus, setAuthStatus] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuthentication = () => {
      try {
        // Check if user is authenticated
        const isAuthenticated = AuthTokenService.isAuthenticated();
        
        if (!isAuthenticated) {
          console.log('🔒 User not authenticated, redirecting to login...');
          setAuthStatus('unauthenticated');
          setIsChecking(false);
          return;
        }

        // Check for specific role requirement
        if (requiredRole) {
          const hasRequiredRole = AuthTokenService.hasRole(requiredRole);
          
          if (!hasRequiredRole) {
            console.log(`🚫 User doesn't have required role: ${requiredRole}`);
            // Redirect to appropriate dashboard instead of login
            const userDashboard = AuthTokenService.getDashboardRoute();
            setAuthStatus('unauthorized');
            setIsChecking(false);
            return;
          }
        }

        console.log('✅ Authentication check passed');
        setAuthStatus('authenticated');
        setIsChecking(false);
      } catch (error) {
        console.error('❌ Authentication check failed:', error);
        setAuthStatus('error');
        setIsChecking(false);
      }
    };

    checkAuthentication();
  }, [requiredRole, location.pathname]);

  // Show loading spinner while checking authentication
  if (isChecking && showLoading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Handle different authentication states
  switch (authStatus) {
    case 'unauthenticated':
      // Store intended destination for redirect after login
      return (
        <Navigate 
          to={fallbackRoute} 
          state={{ from: location.pathname }} 
          replace 
        />
      );

    case 'unauthorized':
      // User is authenticated but doesn't have required role
      const userDashboard = AuthTokenService.getDashboardRoute();
      return <Navigate to={userDashboard} replace />;

    case 'authenticated':
      // User is properly authenticated
      return children;

    case 'error':
    default:
      // Authentication error - clear data and redirect
      AuthTokenService.clearAuthData();
      return <Navigate to={fallbackRoute} replace />;
  }
};

// Higher-order component for role-based access
export const withRoleProtection = (Component, requiredRole) => {
  return (props) => (
    <ProtectedRoute requiredRole={requiredRole}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// Specific protected route components for common use cases
export const AttendeeProtectedRoute = ({ children }) => (
  <ProtectedRoute requiredRole="attendee">
    {children}
  </ProtectedRoute>
);

export const OrganizerProtectedRoute = ({ children }) => (
  <ProtectedRoute requiredRole="organizer">
    {children}
  </ProtectedRoute>
);

export const AdminProtectedRoute = ({ children }) => (
  <ProtectedRoute requiredRole="admin">
    {children}
  </ProtectedRoute>
);

// Public route component (redirects authenticated users to dashboard)
export const PublicRoute = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Small delay to prevent flash
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (isChecking) {
    return <div className="route-loading">Loading...</div>;
  }

  if (AuthTokenService.isAuthenticated()) {
    const dashboardRoute = AuthTokenService.getDashboardRoute();
    return <Navigate to={dashboardRoute} replace />;
  }

  return children;
};

export default ProtectedRoute;
