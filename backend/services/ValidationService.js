// Validation Service Module
// Handles all input validation and sanitization

class ValidationService {
  // Email validation with comprehensive regex
  static isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  // Password strength validation
  static validatePassword(password) {
    const errors = [];
    
    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  // Calculate password strength score
  static calculatePasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/(?=.*[a-z])/.test(password)) score += 1;
    if (/(?=.*[A-Z])/.test(password)) score += 1;
    if (/(?=.*\d)/.test(password)) score += 1;
    if (/(?=.*[@$!%*?&])/.test(password)) score += 1;
    if (/(?=.*[^a-zA-Z0-9@$!%*?&])/.test(password)) score += 1;
    
    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    if (score <= 6) return 'strong';
    return 'very_strong';
  }

  // Phone number validation
  static validatePhone(phone) {
    if (!phone) return { isValid: true }; // Phone is optional
    
    // Remove all non-digit characters for validation
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if it's a valid length (10-15 digits)
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return {
        isValid: false,
        error: 'Phone number must be between 10-15 digits'
      };
    }

    return { isValid: true };
  }

  // Name validation (for usernames, company names, etc.)
  static validateName(name, fieldName = 'Name') {
    const errors = [];
    
    if (!name || !name.trim()) {
      errors.push(`${fieldName} is required`);
      return { isValid: false, errors };
    }

    const trimmedName = name.trim();
    
    if (trimmedName.length < 2) {
      errors.push(`${fieldName} must be at least 2 characters long`);
    }

    if (trimmedName.length > 100) {
      errors.push(`${fieldName} must be less than 100 characters`);
    }

    // Allow letters, spaces, hyphens, apostrophes
    if (!/^[a-zA-Z\s\-'.]+$/.test(trimmedName)) {
      errors.push(`${fieldName} can only contain letters, spaces, hyphens, and apostrophes`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: trimmedName
    };
  }

  // Role validation
  static validateRole(role) {
    const validRoles = ['attendee', 'organizer'];
    
    if (!role) {
      return {
        isValid: false,
        error: 'Role is required'
      };
    }

    if (!validRoles.includes(role.toLowerCase())) {
      return {
        isValid: false,
        error: 'Role must be either "attendee" or "organizer"'
      };
    }

    return {
      isValid: true,
      sanitized: role.toLowerCase()
    };
  }

  // Company/Organization validation
  static validateCompany(companyName) {
    if (!companyName || !companyName.trim()) {
      return {
        isValid: false,
        error: 'Company name is required'
      };
    }

    const trimmed = companyName.trim();
    
    if (trimmed.length < 2) {
      return {
        isValid: false,
        error: 'Company name must be at least 2 characters long'
      };
    }

    if (trimmed.length > 200) {
      return {
        isValid: false,
        error: 'Company name must be less than 200 characters'
      };
    }

    return {
      isValid: true,
      sanitized: trimmed
    };
  }

  // Address validation
  static validateAddress(address) {
    if (!address || !address.trim()) {
      return {
        isValid: false,
        error: 'Address is required'
      };
    }

    const trimmed = address.trim();
    
    if (trimmed.length < 5) {
      return {
        isValid: false,
        error: 'Address must be at least 5 characters long'
      };
    }

    if (trimmed.length > 500) {
      return {
        isValid: false,
        error: 'Address must be less than 500 characters'
      };
    }

    return {
      isValid: true,
      sanitized: trimmed
    };
  }

  // Comprehensive signup validation
  static validateSignupData(data) {
    const errors = [];
    const sanitized = {};

    // Validate email
    if (!data.email || !data.email.trim()) {
      errors.push('Email is required');
    } else {
      const email = data.email.trim().toLowerCase();
      if (!this.isValidEmail(email)) {
        errors.push('Please enter a valid email address');
      } else {
        sanitized.email = email;
      }
    }

    // Validate password
    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    // Validate username/full name
    const nameValidation = this.validateName(data.username, 'Full name');
    if (!nameValidation.isValid) {
      errors.push(...nameValidation.errors);
    } else {
      sanitized.username = nameValidation.sanitized;
    }

    // Validate role
    const roleValidation = this.validateRole(data.role);
    if (!roleValidation.isValid) {
      errors.push(roleValidation.error);
    } else {
      sanitized.role = roleValidation.sanitized;
    }

    // Validate phone (optional)
    if (data.phone) {
      const phoneValidation = this.validatePhone(data.phone);
      if (!phoneValidation.isValid) {
        errors.push(phoneValidation.error);
      } else {
        sanitized.phone = data.phone.trim();
      }
    }

    // Role-specific validation
    if (sanitized.role === 'organizer') {
      // Validate company name
      const companyValidation = this.validateCompany(data.companyName);
      if (!companyValidation.isValid) {
        errors.push(companyValidation.error);
      } else {
        sanitized.companyName = companyValidation.sanitized;
      }

      // Validate contact person
      const contactValidation = this.validateName(data.contactPerson, 'Contact person');
      if (!contactValidation.isValid) {
        errors.push(...contactValidation.errors);
      } else {
        sanitized.contactPerson = contactValidation.sanitized;
      }

      // Validate location/address
      const locationValidation = this.validateAddress(data.location);
      if (!locationValidation.isValid) {
        errors.push(locationValidation.error);
      } else {
        sanitized.location = locationValidation.sanitized;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  }

  // Login validation
  static validateLoginData(data) {
    const errors = [];
    const sanitized = {};

    // Validate email
    if (!data.email || !data.email.trim()) {
      errors.push('Email is required');
    } else {
      const email = data.email.trim().toLowerCase();
      if (!this.isValidEmail(email)) {
        errors.push('Please enter a valid email address');
      } else {
        sanitized.email = email;
      }
    }

    // Validate password
    if (!data.password) {
      errors.push('Password is required');
    } else {
      sanitized.password = data.password;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  }

  // Token validation
  static validateToken(token, tokenType = 'verification') {
    if (!token) {
      return {
        isValid: false,
        error: `${tokenType} token is required`
      };
    }

    if (typeof token !== 'string') {
      return {
        isValid: false,
        error: `Invalid ${tokenType} token format`
      };
    }

    // Check token length (hex tokens should be 64 characters for 32 bytes)
    if (token.length !== 64) {
      return {
        isValid: false,
        error: `Invalid ${tokenType} token length`
      };
    }

    // Check if token is valid hex
    if (!/^[a-f0-9]+$/i.test(token)) {
      return {
        isValid: false,
        error: `Invalid ${tokenType} token format`
      };
    }

    return {
      isValid: true,
      sanitized: token.toLowerCase()
    };
  }

  // Sanitize string input
  static sanitizeString(str, maxLength = 255) {
    if (!str) return '';
    
    return str
      .toString()
      .trim()
      .substring(0, maxLength)
      .replace(/[<>]/g, ''); // Remove potential HTML characters
  }

  // Rate limiting validation helper
  static createRateLimitKey(ip, action) {
    return `rate_limit:${action}:${ip}`;
  }
}

module.exports = ValidationService;
