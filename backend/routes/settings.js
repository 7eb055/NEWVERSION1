const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/auth');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ===== NOTIFICATION SETTINGS =====

// GET notification preferences
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching notification settings for user ID:', req.user.user_id);
    
    // Get attendee notification preferences
    const attendeeQuery = await pool.query(
      'SELECT notification_preferences FROM attendees WHERE user_id = $1',
      [req.user.user_id]
    );
    
    let notificationPrefs = {
      email: true,
      sms: false,
      event_updates: true,
      promotions: false
    };
    
    if (attendeeQuery.rows.length > 0 && attendeeQuery.rows[0].notification_preferences) {
      notificationPrefs = attendeeQuery.rows[0].notification_preferences;
    }
    
    res.json({
      success: true,
      notifications: notificationPrefs
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT update notification preferences
router.put('/notifications', authenticateToken, async (req, res) => {
  try {
    const { email, sms, event_updates, promotions } = req.body;
    
    console.log('Updating notification settings for user ID:', req.user.user_id);
    console.log('New settings:', req.body);
    
    const notificationPrefs = {
      email: email ?? true,
      sms: sms ?? false,
      event_updates: event_updates ?? true,
      promotions: promotions ?? false
    };
    
    // Check if attendee record exists
    const attendeeCheck = await pool.query(
      'SELECT attendee_id FROM attendees WHERE user_id = $1',
      [req.user.user_id]
    );
    
    if (attendeeCheck.rows.length === 0) {
      // Create attendee record if it doesn't exist
      await pool.query(
        'INSERT INTO attendees (user_id, notification_preferences) VALUES ($1, $2)',
        [req.user.user_id, JSON.stringify(notificationPrefs)]
      );
    } else {
      // Update existing attendee record
      await pool.query(
        'UPDATE attendees SET notification_preferences = $1, updated_at = NOW() WHERE user_id = $2',
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
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== PRIVACY SETTINGS =====

// GET privacy settings
router.get('/privacy', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching privacy settings for user ID:', req.user.user_id);
    
    // Get user privacy settings
    const userQuery = await pool.query(
      'SELECT profile_visibility FROM users WHERE user_id = $1',
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
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT update privacy settings
router.put('/privacy', authenticateToken, async (req, res) => {
  try {
    const { profile_visibility } = req.body;
    
    console.log('Updating privacy settings for user ID:', req.user.user_id);
    
    // Validate profile visibility value
    const validVisibilityOptions = ['everyone', 'attendees_only', 'private'];
    if (!validVisibilityOptions.includes(profile_visibility)) {
      return res.status(400).json({ message: 'Invalid profile visibility option' });
    }
    
    await pool.query(
      'UPDATE users SET profile_visibility = $1 WHERE user_id = $2',
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
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== SECURITY SETTINGS =====

// GET security info
router.get('/security', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching security info for user ID:', req.user.user_id);
    
    // Get user security information
    const userQuery = await pool.query(
      `SELECT two_factor_enabled, password_changed_at, last_login, created_at 
       FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userData = userQuery.rows[0];
    
    // Calculate days since password change
    const passwordChangedDate = userData.password_changed_at || userData.created_at;
    const daysSinceChange = Math.floor((new Date() - new Date(passwordChangedDate)) / (1000 * 60 * 60 * 24));
    
    res.json({
      success: true,
      security: {
        two_factor_enabled: userData.two_factor_enabled || false,
        password_changed_days_ago: daysSinceChange,
        last_login: userData.last_login,
        account_created: userData.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching security info:', error);
    res.status(500).json({ message: 'Internal server error' });
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
    
    // Get current password hash
    const userQuery = await pool.query(
      'SELECT password FROM users WHERE user_id = $1',
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
    
    // Update password
    await pool.query(
      'UPDATE users SET password = $1, password_changed_at = NOW() WHERE user_id = $2',
      [newPasswordHash, req.user.user_id]
    );
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT enable/disable 2FA (placeholder for now)
router.put('/two-factor', authenticateToken, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    console.log('Updating 2FA setting for user ID:', req.user.user_id);
    
    await pool.query(
      'UPDATE users SET two_factor_enabled = $1 WHERE user_id = $2',
      [enabled, req.user.user_id]
    );
    
    res.json({
      success: true,
      message: enabled ? '2FA enabled successfully' : '2FA disabled successfully',
      two_factor_enabled: enabled
    });
  } catch (error) {
    console.error('Error updating 2FA setting:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== DATA EXPORT =====

// GET export user data
router.get('/export-data', authenticateToken, async (req, res) => {
  try {
    console.log('Exporting data for user ID:', req.user.user_id);
    
    // Get all user data
    const userData = await pool.query(
      'SELECT user_id, email, role_type, created_at, last_login, profile_visibility FROM users WHERE user_id = $1',
      [req.user.user_id]
    );
    
    const attendeeData = await pool.query(
      `SELECT * FROM attendees WHERE user_id = $1`,
      [req.user.user_id]
    );
    
    const registrationData = await pool.query(
      `SELECT er.*, e.event_name as event_title, e.event_date as start_date, e.end_date 
       FROM eventregistrations er 
       JOIN events e ON er.event_id = e.event_id 
       JOIN attendees a ON er.attendee_id = a.attendee_id 
       WHERE a.user_id = $1`,
      [req.user.user_id]
    );
    
    const exportData = {
      export_date: new Date().toISOString(),
      user: userData.rows[0] || null,
      attendee_profile: attendeeData.rows[0] || null,
      event_registrations: registrationData.rows || [],
      summary: {
        total_registrations: registrationData.rows.length,
        account_age_days: userData.rows[0] ? 
          Math.floor((new Date() - new Date(userData.rows[0].created_at)) / (1000 * 60 * 60 * 24)) : 0
      }
    };
    
    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ message: 'Internal server error' });
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
    
    // Instead of hard delete, we'll deactivate the account
    await client.query(
      `UPDATE users SET 
        is_deleted = true, 
        deleted_at = NOW(), 
        email = CONCAT(email, '_DELETED_', user_id),
        password = NULL
       WHERE user_id = $1`,
      [req.user.user_id]
    );
    
    // Anonymize attendee data
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
       WHERE user_id = $1`,
      [req.user.user_id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Account has been successfully deleted'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
