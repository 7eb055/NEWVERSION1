import React, { useState, useEffect } from 'react';
import NotificationService from '../../services/NotificationService';
import './AttendeeCards.css';

const NotificationsCard = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    fetchNotifications();
  }, []);
  
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await NotificationService.getNotifications({
        limit: 50,
        page: 1
      });
      setNotifications(response.notifications || []);
      setUnreadCount(response.unread_count || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
      // Fallback to empty array if there's an error
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than a minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    // Less than a week
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    
    // Otherwise, show full date
    return date.toLocaleDateString();
  };
  
  const getNotificationIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'event_reminder':
      case 'event':
        return <i className="fas fa-calendar-alt"></i>;
      case 'ticket_confirmation':
        return <i className="fas fa-ticket-alt"></i>;
      case 'reminder':
        return <i className="fas fa-bell"></i>;
      case 'system':
        return <i className="fas fa-info-circle"></i>;
      case 'update':
        return <i className="fas fa-sync-alt"></i>;
      case 'promotion':
        return <i className="fas fa-tag"></i>;
      default:
        return <i className="fas fa-info-circle"></i>;
    }
  };
  
  const handleMarkAsRead = async (id) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const handleDeleteNotification = async (id) => {
    try {
      await NotificationService.deleteNotification(id);
      const deletedNotif = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(notif => notif.id !== id));
      if (deletedNotif && !deletedNotif.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };
  
  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="notifications-card">
        <div className="notifications-header">
          <h2>Notifications</h2>
        </div>
        <div className="notifications-list">
          <div className="loading-message">
            <i className="fas fa-spinner fa-spin"></i>
            <div>Loading notifications...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notifications-card">
        <div className="notifications-header">
          <h2>Notifications</h2>
        </div>
        <div className="notifications-list">
          <div className="error-message">
            <i className="fas fa-exclamation-triangle"></i>
            <div>{error}</div>
            <button onClick={fetchNotifications} className="retry-btn">
              <i className="fas fa-refresh"></i> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="notifications-card">
      <div className="notifications-header">
        <h2>
          Notifications 
          {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
        </h2>
        {notifications.length > 0 && (
          <div className="notifications-actions">
            <button 
              className="btn-mark-all-read"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              <i className="fas fa-check-double"></i> Mark all as read
            </button>
          </div>
        )}
      </div>
      
      <div className="notifications-list">
        {notifications.length > 0 ? (
          notifications.map(notification => (
            <div 
              key={notification.id}
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
              onClick={() => handleMarkAsRead(notification.id)}
            >
              <div className={`notification-icon ${notification.type.toLowerCase()}`}>
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="notification-content">
                <div className="notification-title">
                  {notification.title}
                </div>
                <div className="notification-message">
                  {notification.message}
                </div>
                <div className="notification-time">
                  {formatTimestamp(notification.timestamp)}
                </div>
                {notification.event_name && (
                  <div className="notification-event">
                    <i className="fas fa-calendar"></i> {notification.event_name}
                  </div>
                )}
              </div>
              
              <div className="notification-actions">
                {!notification.read && (
                  <button 
                    className="notification-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notification.id);
                    }}
                    title="Mark as read"
                  >
                    <i className="fas fa-check"></i>
                  </button>
                )}
                <button 
                  className="notification-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNotification(notification.id);
                  }}
                  title="Delete notification"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-notifications">
            <i className="fas fa-bell-slash"></i>
            <div className="empty-message">No notifications</div>
            <div className="empty-submessage">You're all caught up!</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsCard;
