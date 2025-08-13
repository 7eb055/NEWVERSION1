// NotificationService.js - Frontend service for notifications
import ApiService from './ApiService';

class NotificationService {
  // Get user notifications
  static async getNotifications(params = {}) {
    try {
      const queryParams = new URLSearchParams({
        page: params.page || 1,
        limit: params.limit || 20,
        unread_only: params.unreadOnly || false,
        type: params.type || ''
      }).toString();

      const response = await ApiService.get(`/api/notifications?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Get notification statistics
  static async getNotificationStats() {
    try {
      const response = await ApiService.get('/api/notifications/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId) {
    try {
      const response = await ApiService.post(`/api/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  static async markAllAsRead() {
    try {
      const response = await ApiService.post('/api/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  static async deleteNotification(notificationId) {
    try {
      const response = await ApiService.delete(`/api/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Create notification (admin only)
  static async createNotification(notificationData) {
    try {
      const response = await ApiService.post('/api/notifications', notificationData);
      return response.data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get unread count for badge display
  static async getUnreadCount() {
    try {
      const stats = await this.getNotificationStats();
      return stats.unread || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }
}

export default NotificationService;
