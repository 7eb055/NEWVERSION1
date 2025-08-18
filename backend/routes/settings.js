const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/auth');

// Use the shared database pool from the main server
let pool;

// Function to set the database pool (called from main server)
const setPool = (dbPool) => {
  pool = dbPool;
};

// Schema compatibility helper
const getSchemaInfo = async () => {
  try {
    if (!pool) {
      throw new Error('Database pool not initialized');
    }
    
    // Check if we're using the new schema (user_id) or old schema (id)
    const userTableCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('user_id', 'id')
    `);
    
    const hasUserId = userTableCheck.rows.some(row => row.column_name === 'user_id');
    const userIdColumn = hasUserId ? 'user_id' : 'id';
    
    // Check for additional columns
    const columnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('profile_visibility', 'two_factor_enabled', 'password_changed_at', 'role_type', 'is_deleted')
    `);
    
    const attendeeColumnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendees' AND column_name = 'notification_preferences'
    `);
    
    return {
      userIdColumn,
      hasProfileVisibility: columnsCheck.rows.some(row => row.column_name === 'profile_visibility'),
      hasTwoFactorEnabled: columnsCheck.rows.some(row => row.column_name === 'two_factor_enabled'),
      hasPasswordChangedAt: columnsCheck.rows.some(row => row.column_name === 'password_changed_at'),
      hasRoleType: columnsCheck.rows.some(row => row.column_name === 'role_type'),
      hasIsDeleted: columnsCheck.rows.some(row => row.column_name === 'is_deleted'),
      hasNotificationPreferences: attendeeColumnsCheck.rows.length > 0
    };
  } catch (error) {
    console.error('Error checking schema:', error);
    // Default to new schema structure
    return {
      userIdColumn: 'user_id',
      hasProfileVisibility: true,
      hasTwoFactorEnabled: true,
      hasPasswordChangedAt: true,
      hasRoleType: true,
      hasIsDeleted: true,
      hasNotificationPreferences: true
    };
  }
};

// ===== NOTIFICATION SETTINGS =====

// GET notification preferences
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching notification settings for user ID:', req.user.user_id);
    
    const schema = await getSchemaInfo();
    const userIdColumn = schema.userIdColumn;
    
    if (!schema.hasNotificationPreferences) {
      // Fallback for old schema - return default preferences
      const notificationPrefs = {
        email: true,
        sms: false,
        event_updates: true,
        promotions: false
      };
      
      return res.json({
        success: true,
        notifications: notificationPrefs,
        message: 'Using default notification preferences (schema compatibility mode)'
      });
    }
    
    // Get attendee notification preferences
    const attendeeQuery = await pool.query(
      `SELECT notification_preferences FROM attendees WHERE ${userIdColumn} = $1`,
      [req.user.user_id]
    );
    
    let notificationPrefs = {
      email: true,
      sms: false,
      event_updates: true,
      promotions: false
    };
    
    if (attendeeQuery.rows.length > 0 && attendeeQuery.rows[0].notification_preferences) {
      try {
        notificationPrefs = typeof attendeeQuery.rows[0].notification_preferences === 'string' 
          ? JSON.parse(attendeeQuery.rows[0].notification_preferences)
          : attendeeQuery.rows[0].notification_preferences;
      } catch (parseError) {
        console.warn('Failed to parse notification preferences, using defaults:', parseError);
      }
    }
    
    res.json({
      success: true,
      notifications: notificationPrefs
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// PUT update notification preferences
router.put('/notifications', authenticateToken, async (req, res) => {
  try {
    const { email, sms, event_updates, promotions } = req.body;
    
    console.log('Updating notification settings for user ID:', req.user.user_id);
    console.log('New settings:', req.body);
    
    const schema = await getSchemaInfo();
    const userIdColumn = schema.userIdColumn;
    
    if (!schema.hasNotificationPreferences) {
      return res.status(400).json({ 
        message: 'Notification preferences not supported in current database schema',
        success: false 
      });
    }
    
    const notificationPrefs = {
      email: email ?? true,
      sms: sms ?? false,
      event_updates: event_updates ?? true,
      promotions: promotions ?? false
    };
    
    // Check if attendee record exists
    const attendeeCheck = await pool.query(
      `SELECT attendee_id FROM attendees WHERE ${userIdColumn} = $1`,
      [req.user.user_id]
    );
    
    if (attendeeCheck.rows.length === 0) {
      // Create attendee record if it doesn't exist
      await pool.query(
        `INSERT INTO attendees (${userIdColumn}, notification_preferences) VALUES ($1, $2)`,
        [req.user.user_id, JSON.stringify(notificationPrefs)]
      );
    } else {
      // Update existing attendee record
      await pool.query(
        `UPDATE attendees SET notification_preferences = $1, updated_at = NOW() WHERE ${userIdColumn} = $2`,
        [JSON.stringify(notificationPrefs), req.user.user_id]
      );
    }
    
    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      notifications: notificationPrefs
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ===== PRIVACY SETTINGS =====

// GET privacy settings
router.get('/privacy', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching privacy settings for user ID:', req.user.user_id);
    
    const schema = await getSchemaInfo();
    const userIdColumn = schema.userIdColumn;
    
    if (!schema.hasProfileVisibility) {
      // Fallback for old schema - return default privacy settings
      return res.json({
        success: true,
        privacy: {
          profile_visibility: 'everyone'
        },
        message: 'Using default privacy settings (schema compatibility mode)'
      });
    }
    
    // Get user privacy settings
    const userQuery = await pool.query(
      `SELECT profile_visibility FROM users WHERE ${userIdColumn} = $1`,
      [req.user.user_id]
    );
    
    let profileVisibility = 'everyone'; // default
    
    if (userQuery.rows.length > 0 && userQuery.rows[0].profile_visibility) {
      profileVisibility = userQuery.rows[0].profile_visibility;
    }
    
    res.json({
      success: true,
      privacy: {
        profile_visibility: profileVisibility
      }
    });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// PUT update privacy settings
router.put('/privacy', authenticateToken, async (req, res) => {
  try {
    const { profile_visibility } = req.body;
    
    console.log('Updating privacy settings for user ID:', req.user.user_id);
    
    const schema = await getSchemaInfo();
    const userIdColumn = schema.userIdColumn;
    
    if (!schema.hasProfileVisibility) {
      return res.status(400).json({ 
        message: 'Privacy settings not supported in current database schema',
        success: false 
      });
    }
    
    // Validate profile visibility value
    const validVisibilityOptions = ['everyone', 'attendees_only', 'private'];
    if (!validVisibilityOptions.includes(profile_visibility)) {
      return res.status(400).json({ message: 'Invalid profile visibility option' });
    }
    
    await pool.query(
      `UPDATE users SET profile_visibility = $1 WHERE ${userIdColumn} = $2`,
      [profile_visibility, req.user.user_id]
    );
    
    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      privacy: {
        profile_visibility
      }
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ===== SECURITY SETTINGS =====

// GET security info
router.get('/security', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching security info for user ID:', req.user.user_id);
    
    const schema = await getSchemaInfo();
    const userIdColumn = schema.userIdColumn;
    
    // Build query based on available columns
    const selectColumns = ['created_at'];
    if (schema.hasTwoFactorEnabled) selectColumns.push('two_factor_enabled');
    if (schema.hasPasswordChangedAt) selectColumns.push('password_changed_at');
    
    // Always try to get last_login as it's common in both schemas
    selectColumns.push('last_login');
    
    const userQuery = await pool.query(
      `SELECT ${selectColumns.join(', ')} FROM users WHERE ${userIdColumn} = $1`,
      [req.user.user_id]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userData = userQuery.rows[0];
    
    // Calculate days since password change (fallback to account creation if no password_changed_at)
    const passwordChangedDate = userData.password_changed_at || userData.created_at;
    const daysSinceChange = passwordChangedDate 
      ? Math.floor((new Date() - new Date(passwordChangedDate)) / (1000 * 60 * 60 * 24))
      : 0;
    
    res.json({
      success: true,
      security: {
        two_factor_enabled: schema.hasTwoFactorEnabled ? (userData.two_factor_enabled || false) : false,
        password_changed_days_ago: daysSinceChange,
        last_login: userData.last_login,
        account_created: userData.created_at
      },
      ...((!schema.hasTwoFactorEnabled || !schema.hasPasswordChangedAt) && {
        message: 'Some security features not available (schema compatibility mode)'
      })
    });
  } catch (error) {
    console.error('Error fetching security info:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// PUT change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    if (new_password.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }
    
    console.log('Changing password for user ID:', req.user.user_id);
    
    const schema = await getSchemaInfo();
    const userIdColumn = schema.userIdColumn;
    
    // Get current password hash
    const userQuery = await pool.query(
      `SELECT password FROM users WHERE ${userIdColumn} = $1`,
      [req.user.user_id]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, userQuery.rows[0].password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);
    
    // Update password (with or without password_changed_at depending on schema)
    if (schema.hasPasswordChangedAt) {
      await pool.query(
        `UPDATE users SET password = $1, password_changed_at = NOW() WHERE ${userIdColumn} = $2`,
        [newPasswordHash, req.user.user_id]
      );
    } else {
      await pool.query(
        `UPDATE users SET password = $1 WHERE ${userIdColumn} = $2`,
        [newPasswordHash, req.user.user_id]
      );
    }
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// PUT enable/disable 2FA (placeholder for now)
router.put('/two-factor', authenticateToken, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    console.log('Updating 2FA setting for user ID:', req.user.user_id);
    
    const schema = await getSchemaInfo();
    const userIdColumn = schema.userIdColumn;
    
    if (!schema.hasTwoFactorEnabled) {
      return res.status(400).json({ 
        message: '2FA settings not supported in current database schema',
        success: false 
      });
    }
    
    await pool.query(
      `UPDATE users SET two_factor_enabled = $1 WHERE ${userIdColumn} = $2`,
      [enabled, req.user.user_id]
    );
    
    res.json({
      success: true,
      message: enabled ? '2FA enabled successfully' : '2FA disabled successfully',
      two_factor_enabled: enabled
    });
  } catch (error) {
    console.error('Error updating 2FA setting:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ===== DATA EXPORT =====

// GET export user data
router.get('/export-data', authenticateToken, async (req, res) => {
  try {
    console.log('Exporting data for user ID:', req.user.user_id);
    
    const schema = await getSchemaInfo();
    const userIdColumn = schema.userIdColumn;
    
    // Build user query based on available columns
    const userSelectColumns = [userIdColumn, 'email', 'created_at', 'last_login'];
    if (schema.hasRoleType) userSelectColumns.push('role_type');
    if (schema.hasProfileVisibility) userSelectColumns.push('profile_visibility');
    
    // Get all user data
    const userData = await pool.query(
      `SELECT ${userSelectColumns.join(', ')} FROM users WHERE ${userIdColumn} = $1`,
      [req.user.user_id]
    );
    
    const attendeeData = await pool.query(
      `SELECT * FROM attendees WHERE ${userIdColumn} = $1`,
      [req.user.user_id]
    );
    
    // For event registrations, we need to handle different event table structures
    let registrationData = { rows: [] };
    try {
      // Try with event_name first (new schema)
      registrationData = await pool.query(
        `SELECT er.*, e.event_name as event_title, e.event_date as start_date, e.end_date 
         FROM eventregistrations er 
         JOIN events e ON er.event_id = e.event_id 
         JOIN attendees a ON er.attendee_id = a.attendee_id 
         WHERE a.${userIdColumn} = $1`,
        [req.user.user_id]
      );
    } catch (eventNameError) {
      try {
        // Fallback to title if event_name doesn't exist
        registrationData = await pool.query(
          `SELECT er.*, e.title as event_title, e.created_at as start_date 
           FROM eventregistrations er 
           JOIN events e ON er.event_id = e.id 
           JOIN attendees a ON er.attendee_id = a.attendee_id 
           WHERE a.${userIdColumn} = $1`,
          [req.user.user_id]
        );
      } catch (titleError) {
        console.warn('Could not fetch event registrations:', titleError.message);
        // Continue with empty registrations
      }
    }
    
    const exportData = {
      export_date: new Date().toISOString(),
      user: userData.rows[0] || null,
      attendee_profile: attendeeData.rows[0] || null,
      event_registrations: registrationData.rows || [],
      summary: {
        total_registrations: registrationData.rows ? registrationData.rows.length : 0,
        account_age_days: userData.rows[0] ? 
          Math.floor((new Date() - new Date(userData.rows[0].created_at)) / (1000 * 60 * 60 * 24)) : 0
      },
      schema_info: {
        compatibility_mode: !schema.hasProfileVisibility || !schema.hasTwoFactorEnabled,
        available_features: {
          privacy_settings: schema.hasProfileVisibility,
          two_factor_auth: schema.hasTwoFactorEnabled,
          notification_preferences: schema.hasNotificationPreferences
        }
      }
    };
    
    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// ===== ACCOUNT DELETION =====

// DELETE user account (soft delete for safety)
router.delete('/delete-account', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { confirmation } = req.body;
    
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({ 
        message: 'Account deletion requires exact confirmation text: "DELETE_MY_ACCOUNT"' 
      });
    }
    
    console.log('Deleting account for user ID:', req.user.user_id);
    
    const schema = await getSchemaInfo();
    const userIdColumn = schema.userIdColumn;
    
    // Instead of hard delete, we'll deactivate the account
    // Build dynamic query based on available columns
    const updateColumns = [];
    
    // Always try to mark as deleted if possible
    updateColumns.push('deleted_at = NOW()');
    updateColumns.push(`email = CONCAT(email, '_DELETED_', ${userIdColumn})`);
    updateColumns.push('password = NULL');
    
    // Add other columns if they exist
    if (schema.hasIsDeleted) {
      updateColumns.push('is_deleted = true');
    }
    
    await client.query(
      `UPDATE users SET ${updateColumns.join(', ')} WHERE ${userIdColumn} = $1`,
      [req.user.user_id]
    );
    
    // Anonymize attendee data if attendee record exists
    try {
      await client.query(
        `UPDATE attendees SET 
          full_name = 'Deleted User',
          phone = NULL,
          bio = NULL,
          interests = NULL,
          profile_picture_url = NULL,
          social_media_links = NULL,
          emergency_contact_name = NULL,
          emergency_contact_phone = NULL
         WHERE ${userIdColumn} = $1`,
        [req.user.user_id]
      );
    } catch (attendeeError) {
      console.warn('Could not anonymize attendee data (table may not exist):', attendeeError.message);
      // Continue - this is not critical
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Account has been successfully deleted'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting account:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  } finally {
    client.release();
  }
});

module.exports = { router, setPool };
