# EventSQL Database Schema Compatibility

## 🗄️ Database Schema Overview

The application has been updated to work with the `eventsql` database schema, which includes the following main tables:

### Core Tables

1. **EventCompanies**
   - `company_id` (Primary Key)
   - `company_name` 
   - `address`
   - `contact_info`

2. **Roles**
   - `role_id` (Primary Key)
   - `role_name` ('admin', 'organizer', 'attendee')

3. **Users**
   - `user_id` (Primary Key)
   - `username` (Unique)
   - `password`
   - `email` (Unique)
   - `phone`
   - `role_id` (References Roles)
   - `company_id` (References EventCompanies)

4. **Events**
   - `event_id` (Primary Key)
   - `event_name`
   - `event_date`
   - `event_location`
   - `company_id` (References EventCompanies)
   - `created_by` (References Users)
   - `description`
   - `capacity`

## 🔄 Frontend Compatibility Updates

### Profile Page Updates

The Profile component has been updated to handle the new schema:

1. **Username Field**: Uses `username` instead of `name`
2. **Role Display**: Shows role name from the Roles table
3. **Company Information**: Displays company details from EventCompanies table
4. **Company Address**: Shows full company address
5. **Company Contact**: Displays company contact information

### Data Structure Mapping

```javascript
// Old Schema (original)
user: {
  name: "John Doe",
  email: "john@email.com",
  role: "attendee",
  company_name: "ABC Corp"
}

// New Schema (eventsql compatible)
user: {
  user_id: 1,
  username: "johndoe",
  email: "john@email.com",
  phone: "123-456-7890",
  role_id: 3,
  company_id: 1
}

role: {
  role_id: 3,
  role_name: "attendee"
}

company: {
  company_id: 1,
  company_name: "ABC Corp",
  address: "123 Business St, City, State 12345",
  contact_info: "contact@abccorp.com"
}
```

### Header Component Updates

The header now properly handles:
- Username display (fallback to email if username not available)
- Role-based navigation
- Company information in profile dropdown

## 🛠️ Backend Integration Requirements

To fully utilize the eventsql schema, the following backend endpoints should be implemented:

### User Profile Endpoints

```javascript
// Get user profile with company and role details
GET /api/users/:user_id/profile
Response: {
  success: true,
  data: {
    user: { user_id, username, email, phone, role_id, company_id },
    role: { role_id, role_name },
    company: { company_id, company_name, address, contact_info }
  }
}

// Update user profile
PUT /api/users/:user_id/profile
Body: { username, email, phone }

// Get user statistics
GET /api/users/:user_id/stats
Response: {
  success: true,
  data: {
    events_attended: 0,
    events_organized: 0,
    reviews_given: 0
  }
}
```

### Authentication Updates

The login endpoint should return user data compatible with the new schema:

```javascript
// Login response
POST /api/auth/login
Response: {
  success: true,
  token: "jwt_token",
  user: {
    user_id: 1,
    username: "johndoe",
    email: "john@email.com",
    phone: "123-456-7890",
    role_id: 3,
    company_id: 1,
    role_name: "attendee"  // Joined from Roles table
  }
}
```

## 📋 Current Compatibility Features

### ✅ Implemented
- [x] Profile page displays username instead of name
- [x] Role information properly shown
- [x] Company information display (when available)
- [x] Header username display with fallbacks
- [x] Loading states for async data fetching
- [x] Error handling for profile data
- [x] Responsive design maintained

### 🔄 Backward Compatibility
- [x] Fallback to `name` field if `username` not available
- [x] Email prefix fallback for display name
- [x] Graceful handling of missing company data
- [x] Default role assignment if role data unavailable

### 🚀 Future Enhancements
- [ ] Real-time user statistics from Events table
- [ ] Company management for organizers
- [ ] Role-based permissions and UI
- [ ] Event creation linked to company
- [ ] Advanced user search and filtering

## 🧪 Testing Schema Compatibility

### Test User Data Structure
```javascript
// Expected user object from backend
const testUser = {
  user_id: 1,
  username: "testuser",
  email: "test@example.com",
  phone: "555-0123",
  role_id: 3,
  company_id: 1,
  role_name: "attendee",
  company: {
    company_id: 1,
    company_name: "Test Company",
    address: "123 Test St, Test City, TC 12345",
    contact_info: "info@testcompany.com"
  }
};
```

### Profile Page Testing
1. Login with test credentials
2. Navigate to `/profile`
3. Verify all fields display correctly:
   - Username from `username` field
   - Email address
   - Phone number
   - Role name
   - Company name and details (if available)

## 📝 Migration Notes

If migrating from the old schema:
1. Map `name` field to `username`
2. Convert string roles to role_id references
3. Extract company information to EventCompanies table
4. Update foreign key relationships
5. Test authentication flow with new user structure

The frontend is now fully compatible with the eventsql schema while maintaining backward compatibility for development and testing.
