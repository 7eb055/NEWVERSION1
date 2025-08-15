// Database Service Module
// Handles all database operations and queries related to authentication

class DatabaseService {
  constructor(pool) {
    this.pool = pool;
  }

  // Test database connection
  async testConnection() {
    try {
      const result = await this.pool.query('SELECT NOW() as current_time');
      console.log('✅ Database connection successful:', result.rows[0].current_time);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  // Check if user exists by email
  async findUserByEmail(email) {
    try {
      const result = await this.pool.query(
        `SELECT user_id, email, password, role_type, is_email_verified, 
                email_verification_token, email_verification_token_expires,
                created_at, last_login, email_verified_at
         FROM Users 
         WHERE email = $1`,
        [email]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Check if user exists by ID
  async findUserById(userId) {
    try {
      const result = await this.pool.query(
        `SELECT user_id, email, role_type, is_email_verified, 
                created_at, last_login, email_verified_at
         FROM Users 
         WHERE user_id = $1`,
        [userId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Check if user has specific role
  async checkUserRole(userId, role) {
    try {
      let query;

      if (role === 'attendee') {
        query = 'SELECT attendee_id, full_name, phone FROM Attendees WHERE user_id = $1';
      } else if (role === 'organizer') {
        query = 'SELECT organizer_id, full_name, phone, company_name, business_address FROM Organizers WHERE user_id = $1';
      } else {
        throw new Error('Invalid role specified');
      }

      const result = await this.pool.query(query, [userId]);
      return {
        hasRole: result.rows.length > 0,
        roleData: result.rows.length > 0 ? result.rows[0] : null
      };
    } catch (error) {
      console.error(`Error checking ${role} role:`, error);
      throw error;
    }
  }

  // Get all user roles and profile data
  async getUserRoles(userId) {
    try {
      const roles = [];

      // Check attendee role
      const attendeeResult = await this.pool.query(
        'SELECT full_name, phone FROM Attendees WHERE user_id = $1',
        [userId]
      );

      if (attendeeResult.rows.length > 0) {
        roles.push({
          role: 'attendee',
          ...attendeeResult.rows[0]
        });
      }

      // Check organizer role
      const organizerResult = await this.pool.query(
        'SELECT full_name, phone, company_name, business_address FROM Organizers WHERE user_id = $1',
        [userId]
      );

      if (organizerResult.rows.length > 0) {
        roles.push({
          role: 'organizer',
          ...organizerResult.rows[0]
        });
      }

      return roles;
    } catch (error) {
      console.error('Error getting user roles:', error);
      throw error;
    }
  }

  // Create new user account
  async createUser(userData, client = null) {
    const dbClient = client || this.pool;
    
    try {
      const { email, hashedPassword, role, verificationToken, tokenExpires } = userData;

      const result = await dbClient.query(
        `INSERT INTO Users (email, password, role_type, email_verification_token, email_verification_token_expires) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING user_id, email, role_type, created_at`,
        [email, hashedPassword, role, verificationToken, tokenExpires]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Add attendee role to user
  async addAttendeeRole(userId, attendeeData, client = null) {
    const dbClient = client || this.pool;
    
    try {
      const { fullName, phone } = attendeeData;

      const result = await dbClient.query(
        `INSERT INTO attendees (user_id, full_name, phone) 
         VALUES ($1, $2, $3) 
         RETURNING attendee_id, full_name, phone`,
        [userId, fullName, phone]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error adding attendee role:', error);
      throw error;
    }
  }

  // Add organizer role to user
  async addOrganizerRole(userId, organizerData, client = null) {
    const dbClient = client || this.pool;
    
    try {
      const { fullName, phone, companyName, businessAddress } = organizerData;

      // First, handle company if provided
      let companyId = null;
      if (companyName) {
        const existingCompany = await dbClient.query(
          'SELECT company_id FROM EventCompanies WHERE company_name = $1',
          [companyName]
        );

        if (existingCompany.rows.length > 0) {
          companyId = existingCompany.rows[0].company_id;
        } else {
          const newCompany = await dbClient.query(
            'INSERT INTO EventCompanies (company_name, address) VALUES ($1, $2) RETURNING company_id',
            [companyName, businessAddress]
          );
          companyId = newCompany.rows[0].company_id;
        }
      }

      const result = await dbClient.query(
        `INSERT INTO Organizers (user_id, full_name, phone, company_name, company_id, business_address) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING organizer_id, full_name, phone, company_name, business_address`,
        [userId, fullName, phone, companyName, companyId, businessAddress]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error adding organizer role:', error);
      throw error;
    }
  }

  // Update user verification status
  async verifyUserEmail(userId, token, client = null) {
    const dbClient = client || this.pool;
    
    try {
      const result = await dbClient.query(
        `UPDATE Users 
         SET is_email_verified = TRUE, 
             email_verified_at = NOW()
         WHERE user_id = $1 AND email_verification_token = $2 AND is_email_verified = FALSE
         RETURNING user_id, email, is_email_verified, email_verified_at`,
        [userId, token]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error verifying user email:', error);
      throw error;
    }
  }

  // Clear verification token after successful verification
  async clearVerificationToken(userId, client = null) {
    const dbClient = client || this.pool;
    
    try {
      await dbClient.query(
        `UPDATE Users 
         SET email_verification_token = NULL,
             email_verification_token_expires = NULL
         WHERE user_id = $1`,
        [userId]
      );

      return true;
    } catch (error) {
      console.error('Error clearing verification token:', error);
      throw error;
    }
  }

  // Update verification token (for resending)
  async updateVerificationToken(userId, newToken, tokenExpires) {
    try {
      const result = await this.pool.query(
        `UPDATE Users 
         SET email_verification_token = $1, 
             email_verification_token_expires = $2,
             updated_at = NOW()
         WHERE user_id = $3 AND is_email_verified = FALSE
         RETURNING user_id, email`,
        [newToken, tokenExpires, userId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error updating verification token:', error);
      throw error;
    }
  }

  // Update last login time
  async updateLastLogin(userId) {
    try {
      await this.pool.query(
        'UPDATE Users SET last_login = NOW() WHERE user_id = $1',
        [userId]
      );

      return true;
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  // Log verification attempt
  async logVerificationAttempt(logData, client = null) {
    const dbClient = client || this.pool;
    
    try {
      const { userId, email, verificationToken, tokenExpires } = logData;

      await dbClient.query(
        `INSERT INTO EmailVerificationLogs (user_id, email, verification_token, token_expires) 
         VALUES ($1, $2, $3, $4)`,
        [userId, email, verificationToken, tokenExpires]
      );

      return true;
    } catch (error) {
      console.error('Error logging verification attempt:', error);
      // Don't throw here as this is non-critical
      return false;
    }
  }

  // Update verification log with success status
  async updateVerificationLog(userId, token, success = true, client = null) {
    const dbClient = client || this.pool;
    
    try {
      await dbClient.query(
        `UPDATE EmailVerificationLogs 
         SET verification_success = $1, verified_at = NOW()
         WHERE user_id = $2 AND verification_token = $3`,
        [success, userId, token]
      );

      return true;
    } catch (error) {
      console.error('Error updating verification log:', error);
      // Don't throw here as this is non-critical
      return false;
    }
  }

  // Get verification statistics for debugging
  async getVerificationStats(email = null) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_attempts,
          COUNT(CASE WHEN verification_success = true THEN 1 END) as successful_verifications,
          COUNT(CASE WHEN verification_success = false THEN 1 END) as failed_verifications,
          MAX(created_at) as latest_attempt
        FROM EmailVerificationLogs
      `;
      
      const params = [];
      if (email) {
        query += ' WHERE email = $1';
        params.push(email);
      }

      const result = await this.pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting verification stats:', error);
      throw error;
    }
  }

  // Clean up expired tokens (maintenance function)
  async cleanupExpiredTokens() {
    try {
      const result = await this.pool.query(
        `UPDATE Users 
         SET email_verification_token = NULL,
             email_verification_token_expires = NULL
         WHERE email_verification_token_expires < NOW() 
           AND email_verification_token IS NOT NULL
         RETURNING user_id, email`
      );

      console.log(`Cleaned up ${result.rows.length} expired verification tokens`);
      return result.rows.length;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      throw error;
    }
  }

  // Transaction helper
  async withTransaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = DatabaseService;
