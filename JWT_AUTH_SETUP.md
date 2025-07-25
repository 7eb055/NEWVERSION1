# JWT Authentication Setup Guide

## 🎯 Overview

Your login system now includes JWT token-based authentication with automatic session management and role-based redirects. Users stay logged in across browser sessions and are automatically redirected to their appropriate dashboards.

## ✅ What's Been Implemented

### 1. JWT Token Management
- **Automatic Token Storage**: JWT tokens are securely stored in localStorage
- **Session Persistence**: Users stay logged in across browser sessions
- **Token Expiration Handling**: Automatic logout when tokens expire
- **Role-Based Access**: Different dashboard access based on user roles

### 2. Enhanced Login Component
- **Smart Redirects**: Automatically redirect based on user role
- **Session Check**: Redirect already-authenticated users to their dashboard
- **Improved Error Handling**: Better user feedback for all error scenarios
- **Clean Form Management**: Proper form state management

### 3. Protected Route System
- **Route Protection**: Secure access to authenticated-only pages
- **Role-Based Access**: Restrict routes based on user roles
- **Automatic Redirects**: Smart redirection based on authentication state
- **Loading States**: User-friendly loading indicators

### 4. API Service Integration
- **Automatic Headers**: JWT tokens automatically included in API requests
- **Error Handling**: Centralized error handling with automatic logout on token expiration
- **Request Interceptors**: Consistent request/response handling

## 🚀 How It Works

### User Flow
1. **Login**: User enters credentials
2. **Authentication**: Backend validates and returns JWT token
3. **Storage**: Token and user data stored securely
4. **Role Detection**: System determines user role (attendee/organizer)
5. **Redirect**: User redirected to appropriate dashboard
6. **Session Management**: User stays logged in until token expires

### Role-Based Redirects
- **Attendees**: Redirected to `/attendee-dashboard`
- **Organizers**: Redirected to `/organizer-dashboard`
- **Multi-Role Users**: Redirected based on primary role
- **Fallback**: Default to attendee dashboard if role unclear

## 🔧 File Structure

```
eventfrontend/src/
├── services/
│   ├── AuthTokenService.js     # JWT token management
│   └── ApiService.js           # API calls with auto JWT headers
├── components/
│   ├── ProtectedRoute.jsx      # Route protection
│   └── css/
│       └── ProtectedRoute.css  # Loading states styling
├── Page/
│   └── Login.jsx               # Enhanced login component
└── App.jsx                     # Updated with protected routes
```

## 📋 Testing the Implementation

### 1. Start Both Servers
```bash
# Terminal 1: Backend
cd backend
node server-modular.js  # or node server.js

# Terminal 2: Frontend  
cd eventfrontend
npm run dev
```

### 2. Test Login Flow
1. **Create Test Users** (if not already done):
   ```bash
   # In backend directory
   node test-modular-auth.js
   ```

2. **Test Attendee Login**:
   - Go to `http://localhost:5173/login`
   - Use attendee credentials
   - Should redirect to `/attendee-dashboard`

3. **Test Organizer Login**:
   - Use organizer credentials
   - Should redirect to `/organizer-dashboard`

### 3. Test Session Persistence
1. **Login and Close Browser**
2. **Reopen and Navigate to Login**
3. **Should Auto-Redirect** to appropriate dashboard

### 4. Test Route Protection
1. **Try accessing protected routes without login**:
   - `http://localhost:5173/attendee-dashboard`
   - `http://localhost:5173/organizer-dashboard`
   - Should redirect to login page

2. **Login and try accessing wrong role routes**:
   - Attendee trying to access organizer dashboard
   - Should redirect to appropriate dashboard

## 🔒 Security Features

### Token Security
- **JWT Tokens**: Secure, stateless authentication
- **Automatic Expiration**: 24-hour token expiration (configurable)
- **Secure Storage**: Tokens stored in localStorage with proper cleanup
- **Role Validation**: Server-side role validation

### Route Security
- **Protected Routes**: All sensitive routes require authentication
- **Role-Based Access**: Routes restricted by user role
- **Automatic Logout**: Expired tokens trigger automatic logout
- **No Token Exposure**: Tokens never exposed in URLs

## 🛠️ Customization

### Modify Token Expiration
In `AuthTokenService.js`:
```javascript
// Change the expiration check (currently 24 hours)
static isTokenExpired() {
  // ... existing code ...
  return hoursSinceLogin > 48; // Change to 48 hours
}
```

### Add New Protected Routes
In `App.jsx`:
```javascript
<Route 
  path="/new-protected-page" 
  element={
    <ProtectedRoute requiredRole="organizer">
      <NewComponent />
    </ProtectedRoute>
  } 
/>
```

### Add New Roles
In `AuthTokenService.js`:
```javascript
static getDashboardRoute() {
  const role = this.getUserRole();
  
  switch (role) {
    case 'organizer':
      return '/organizer-dashboard';
    case 'attendee':
      return '/attendee-dashboard';
    case 'admin':              // Add new role
      return '/admin-dashboard';
    case 'vendor':             // Add another role
      return '/vendor-dashboard';
    default:
      return '/attendee-dashboard';
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **User Not Redirecting After Login**
   ```javascript
   // Check in browser console
   console.log(AuthTokenService.getAuthSummary());
   ```

2. **Routes Not Protected**
   ```javascript
   // Verify in component
   console.log('Auth status:', AuthTokenService.isAuthenticated());
   ```

3. **Token Not Persisting**
   ```javascript
   // Check localStorage in browser dev tools
   localStorage.getItem('authToken');
   localStorage.getItem('user');
   ```

4. **API Requests Failing**
   ```javascript
   // Check if token is being sent
   // Look for Authorization header in Network tab
   ```

### Debug Utilities

```javascript
// Add to any component for debugging
import AuthTokenService from '../services/AuthTokenService';

// Log current auth state
console.log('Auth Summary:', AuthTokenService.getAuthSummary());

// Check specific aspects
console.log('Is Authenticated:', AuthTokenService.isAuthenticated());
console.log('User Role:', AuthTokenService.getUserRole());
console.log('Dashboard Route:', AuthTokenService.getDashboardRoute());
```

## 📈 Next Steps

1. **Add Logout Functionality**:
   ```javascript
   const handleLogout = () => {
     AuthTokenService.logout(navigate);
   };
   ```

2. **Add Remember Me Feature**:
   - Extend token expiration for "remember me" users
   - Store preference in localStorage

3. **Add Profile Management**:
   - Use ApiService to update user profiles
   - Refresh stored user data after updates

4. **Add Token Refresh**:
   - Implement automatic token refresh before expiration
   - Background token renewal

## 🎉 Benefits Achieved

- ✅ **Seamless User Experience**: No repeated logins required
- ✅ **Role-Based Security**: Proper access control by user role
- ✅ **Automatic Session Management**: Smart login/logout handling
- ✅ **Protected Routes**: Secure access to sensitive pages
- ✅ **Clean Code Architecture**: Modular, maintainable components
- ✅ **Enhanced Security**: JWT-based authentication with proper validation

Your authentication system is now enterprise-ready with proper JWT token management, role-based access control, and seamless user experience!
