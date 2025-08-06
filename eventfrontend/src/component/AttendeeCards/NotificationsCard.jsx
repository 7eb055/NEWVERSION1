import React, { useState, useEffect } from 'react';
import './AttendeeCards.css';

const NotificationsCard = ({ notifications, onMarkAsRead, onMarkAllAsRead, onDeleteNotification }) => {
  const [activeNotifications, setActiveNotifications] = useState([]);
  
  useEffect(() => {
    setActiveNotifications(notifications || []);
  }, [notifications]);
  
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
  
  const handleMarkAsRead = (id) => {
    onMarkAsRead(id);
    setActiveNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };
  
  const handleDeleteNotification = (id) => {
    onDeleteNotification(id);
    setActiveNotifications(prev => prev.filter(notif => notif.id !== id));
  };
  
  const handleMarkAllAsRead = () => {
    onMarkAllAsRead();
    setActiveNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };
  
  return (
    <div className="notifications-card">
      <div className="notifications-header">
        <h2>Notifications</h2>
        {activeNotifications.length > 0 && (
          <div className="notifications-actions">
            <button 
              className="btn-mark-all-read"
              onClick={handleMarkAllAsRead}
            >
              <i className="fas fa-check-double"></i> Mark all as read
            </button>
          </div>
        )}
      </div>
      
      <div className="notifications-list">
        {activeNotifications.length > 0 ? (
          activeNotifications.map(notification => (
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
