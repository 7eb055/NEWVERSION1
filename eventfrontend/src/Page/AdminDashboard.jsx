import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AuthTokenService from '../services/AuthTokenService';
import Header from '../component/header';
import Footer from '../component/footer';
import './css/AdminDashboard.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dashboard Stats
  const [stats, setStats] = useState({
    total_users: 0,
    total_events: 0,
    total_organizers: 0,
    total_attendees: 0,
    total_revenue: 0,
    recent_users: 0,
    recent_events: 0,
  });

  // Users Management
  const [users, setUsers] = useState([]);
  const [userPagination, setUserPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [userFilters, setUserFilters] = useState({ search: '', role: '' });
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Events Management  
  const [events, setEvents] = useState([]);
  const [eventFilters, setEventFilters] = useState({ search: '', status: '' });
  const [selectedEvents, setSelectedEvents] = useState([]);

  // System Logs
  const [logs, setLogs] = useState([]);
  const [logFilters, setLogFilters] = useState({ level: '', page: 1 });

  // System Health
  const [systemHealth, setSystemHealth] = useState(null);

  // Reports
  const [reports, setReports] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('30');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, userFilters, userPagination.page]);

  useEffect(() => {
    if (activeTab === 'events') fetchEvents();
  }, [activeTab, eventFilters]);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, logFilters]);

  useEffect(() => {
    if (activeTab === 'system') fetchSystemHealth();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'reports') fetchReports();
  }, [activeTab, reportPeriod]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(`${API_BASE}/api/admin/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      setError('Failed to fetch dashboard data. You may not have admin permissions.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = AuthTokenService.getToken();
      const params = new URLSearchParams({
        page: userPagination.page,
        limit: 10,
        ...userFilters
      });
      
      const response = await axios.get(`${API_BASE}/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUsers(response.data.users || response.data);
      if (response.data.total !== undefined) {
        setUserPagination(prev => ({
          ...prev,
          total: response.data.total,
          totalPages: response.data.totalPages
        }));
      }
    } catch (err) {
      setError('Failed to fetch users');
      console.error(err);
    }
  };

  const fetchEvents = async () => {
    try {
      const token = AuthTokenService.getToken();
      const params = new URLSearchParams(eventFilters);
      
      const response = await axios.get(`${API_BASE}/api/admin/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEvents(response.data);
    } catch (err) {
      setError('Failed to fetch events');
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      const token = AuthTokenService.getToken();
      const params = new URLSearchParams(logFilters);
      
      const response = await axios.get(`${API_BASE}/api/admin/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setLogs(response.data);
    } catch (err) {
      setError('Failed to fetch logs');
      console.error(err);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(`${API_BASE}/api/admin/system-health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSystemHealth(response.data);
    } catch (err) {
      setError('Failed to fetch system health');
      console.error(err);
    }
  };

  const fetchReports = async () => {
    try {
      const token = AuthTokenService.getToken();
      const response = await axios.get(`${API_BASE}/api/admin/reports?period=${reportPeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setReports(response.data);
    } catch (err) {
      setError('Failed to fetch reports');
      console.error(err);
    }
  };

  const handleUserAction = async (action, userId, data = {}) => {
    try {
      const token = AuthTokenService.getToken();
      let endpoint = '';
      let method = 'PUT';
      
      switch (action) {
        case 'updateRole':
          endpoint = `/api/admin/users/${userId}/role`;
          break;
        case 'delete':
          endpoint = `/api/admin/users/${userId}`;
          method = 'DELETE';
          break;
        default:
          return;
      }

      await axios({
        method,
        url: `${API_BASE}${endpoint}`,
        headers: { Authorization: `Bearer ${token}` },
        data
      });

      setSuccess(`User ${action} completed successfully`);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(`Failed to ${action} user`);
      console.error(err);
    }
  };

  const handleEventAction = async (action, eventId, data = {}) => {
    try {
      const token = AuthTokenService.getToken();
      let endpoint = '';
      let method = 'PUT';
      
      switch (action) {
        case 'updateStatus':
          endpoint = `/api/admin/events/${eventId}/status`;
          break;
        case 'delete':
          endpoint = `/api/admin/events/${eventId}`;
          method = 'DELETE';
          break;
        default:
          return;
      }

      await axios({
        method,
        url: `${API_BASE}${endpoint}`,
        headers: { Authorization: `Bearer ${token}` },
        data
      });

      setSuccess(`Event ${action} completed successfully`);
      fetchEvents();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(`Failed to ${action} event`);
      console.error(err);
    }
  };

  const handleBulkAction = async (action, target, data = {}) => {
    const selectedIds = target === 'users' ? selectedUsers : selectedEvents;
    
    if (selectedIds.length === 0) {
      setError('No items selected');
      return;
    }

    try {
      const token = AuthTokenService.getToken();
      await axios.post(`${API_BASE}/api/admin/bulk-actions`, {
        action,
        target,
        ids: selectedIds,
        data
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(`Bulk ${action} completed successfully`);
      if (target === 'users') {
        setSelectedUsers([]);
        fetchUsers();
      } else {
        setSelectedEvents([]);
        fetchEvents();
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(`Failed to perform bulk ${action}`);
      console.error(err);
    }
  };

  const renderDashboard = () => (
    <div className="admin-dashboard-content">
      <h2>Dashboard Overview</h2>
      
      {isLoading ? (
        <div className="loading-spinner">Loading...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>Total Users</h3>
                <p className="stat-number">{stats.total_users}</p>
                <small>+{stats.recent_users} this month</small>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-content">
                <h3>Total Events</h3>
                <p className="stat-number">{stats.total_events}</p>
                <small>+{stats.recent_events} this month</small>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🏢</div>
              <div className="stat-content">
                <h3>Organizers</h3>
                <p className="stat-number">{stats.total_organizers}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🎟️</div>
              <div className="stat-content">
                <h3>Attendees</h3>
                <p className="stat-number">{stats.total_attendees}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>Total Revenue</h3>
                <p className="stat-number">${stats.total_revenue?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderUserManagement = () => (
    <div className="admin-management-content">
      <div className="management-header">
        <h2>User Management</h2>
        <div className="management-actions">
          <input
            type="text"
            placeholder="Search users..."
            value={userFilters.search}
            onChange={(e) => setUserFilters(prev => ({ ...prev, search: e.target.value }))}
            className="search-input"
          />
          <select
            value={userFilters.role}
            onChange={(e) => setUserFilters(prev => ({ ...prev, role: e.target.value }))}
            className="filter-select"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="organizer">Organizer</option>
            <option value="attendee">Attendee</option>
          </select>
        </div>
      </div>

      <div className="bulk-actions">
        <button 
          onClick={() => handleBulkAction('delete', 'users')}
          className="btn-bulk btn-danger"
          disabled={selectedUsers.length === 0}
        >
          Delete Selected ({selectedUsers.length})
        </button>
        <select
          onChange={(e) => {
            if (e.target.value) {
              handleBulkAction('update_role', 'users', { role_type: e.target.value });
              e.target.value = '';
            }
          }}
          className="bulk-select"
          disabled={selectedUsers.length === 0}
        >
          <option value="">Change Role...</option>
          <option value="admin">Admin</option>
          <option value="organizer">Organizer</option>
          <option value="attendee">Attendee</option>
        </select>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers(users.map(user => user.user_id));
                    } else {
                      setSelectedUsers([]);
                    }
                  }}
                  checked={selectedUsers.length === users.length && users.length > 0}
                />
              </th>
              <th>ID</th>
              <th>Email</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.user_id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.user_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(prev => [...prev, user.user_id]);
                      } else {
                        setSelectedUsers(prev => prev.filter(id => id !== user.user_id));
                      }
                    }}
                  />
                </td>
                <td>{user.user_id}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role_type}`}>
                    {user.role_type}
                  </span>
                </td>
                <td>{user.is_email_verified ? '✅' : '❌'}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                <td>
                  <div className="action-buttons">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleUserAction('updateRole', user.user_id, { role_type: e.target.value });
                          e.target.value = '';
                        }
                      }}
                      className="action-select"
                    >
                      <option value="">Change Role</option>
                      {['admin', 'organizer', 'attendee']
                        .filter(role => role !== user.role_type)
                        .map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))
                      }
                    </select>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this user?')) {
                          handleUserAction('delete', user.user_id);
                        }
                      }}
                      className="btn-action btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {userPagination.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setUserPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={userPagination.page === 1}
            className="btn-pagination"
          >
            Previous
          </button>
          <span>Page {userPagination.page} of {userPagination.totalPages}</span>
          <button
            onClick={() => setUserPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={userPagination.page === userPagination.totalPages}
            className="btn-pagination"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  const renderEventManagement = () => (
    <div className="admin-management-content">
      <div className="management-header">
        <h2>Event Management</h2>
        <div className="management-actions">
          <input
            type="text"
            placeholder="Search events..."
            value={eventFilters.search}
            onChange={(e) => setEventFilters(prev => ({ ...prev, search: e.target.value }))}
            className="search-input"
          />
          <select
            value={eventFilters.status}
            onChange={(e) => setEventFilters(prev => ({ ...prev, status: e.target.value }))}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="bulk-actions">
        <button 
          onClick={() => handleBulkAction('delete', 'events')}
          className="btn-bulk btn-danger"
          disabled={selectedEvents.length === 0}
        >
          Delete Selected ({selectedEvents.length})
        </button>
        <select
          onChange={(e) => {
            if (e.target.value) {
              handleBulkAction('update_status', 'events', { status: e.target.value });
              e.target.value = '';
            }
          }}
          className="bulk-select"
          disabled={selectedEvents.length === 0}
        >
          <option value="">Change Status...</option>
          <option value="published">Published</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEvents(events.map(event => event.event_id));
                    } else {
                      setSelectedEvents([]);
                    }
                  }}
                  checked={selectedEvents.length === events.length && events.length > 0}
                />
              </th>
              <th>ID</th>
              <th>Event Name</th>
              <th>Organizer</th>
              <th>Status</th>
              <th>Date</th>
              <th>Price</th>
              <th>Registrations</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event.event_id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event.event_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEvents(prev => [...prev, event.event_id]);
                      } else {
                        setSelectedEvents(prev => prev.filter(id => id !== event.event_id));
                      }
                    }}
                  />
                </td>
                <td>{event.event_id}</td>
                <td>{event.event_name}</td>
                <td>{event.organizer_name || `ID: ${event.organizer_id}`}</td>
                <td>
                  <span className={`status-badge status-${event.status}`}>
                    {event.status}
                  </span>
                </td>
                <td>{new Date(event.event_date).toLocaleDateString()}</td>
                <td>GH₵{event.ticket_price || '0.00'}</td>
                <td>{event.registration_count || 0}</td>
                <td>
                  <div className="action-buttons">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleEventAction('updateStatus', event.event_id, { status: e.target.value });
                          e.target.value = '';
                        }
                      }}
                      className="action-select"
                    >
                      <option value="">Change Status</option>
                      {['draft', 'published', 'cancelled', 'completed']
                        .filter(status => status !== event.status)
                        .map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))
                      }
                    </select>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this event?')) {
                          handleEventAction('delete', event.event_id);
                        }
                      }}
                      className="btn-action btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSystemLogs = () => (
    <div className="admin-management-content">
      <div className="management-header">
        <h2>System Logs</h2>
        <div className="management-actions">
          <select
            value={logFilters.level}
            onChange={(e) => setLogFilters(prev => ({ ...prev, level: e.target.value }))}
            className="filter-select"
          >
            <option value="">All Levels</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="ERROR">Error</option>
          </select>
          <button onClick={fetchLogs} className="btn-refresh">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Level</th>
              <th>Message</th>
              <th>Timestamp</th>
              <th>User ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.log_id}>
                <td>{log.log_id}</td>
                <td>
                  <span className={`log-level log-${log.level.toLowerCase()}`}>
                    {log.level}
                  </span>
                </td>
                <td>{log.message}</td>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
                <td>{log.user_id || 'System'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSystemHealth = () => (
    <div className="admin-management-content">
      <h2>System Health & Monitoring</h2>
      
      {systemHealth && (
        <div className="health-grid">
          <div className="health-card">
            <h3>System Status</h3>
            <div className={`status-indicator ${systemHealth.status}`}>
              {systemHealth.status.toUpperCase()}
            </div>
          </div>
          
          <div className="health-card">
            <h3>Database</h3>
            <div className="status-indicator healthy">
              {systemHealth.database.toUpperCase()}
            </div>
          </div>
          
          <div className="health-card">
            <h3>Uptime</h3>
            <p>{Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m</p>
          </div>
          
          <div className="health-card">
            <h3>Memory Usage</h3>
            <div className="memory-info">
              <p>RSS: {systemHealth.memory.rss}</p>
              <p>Heap Total: {systemHealth.memory.heapTotal}</p>
              <p>Heap Used: {systemHealth.memory.heapUsed}</p>
            </div>
          </div>
        </div>
      )}
      
      <button onClick={fetchSystemHealth} className="btn-refresh">
        🔄 Refresh Health Status
      </button>
    </div>
  );

  const renderReports = () => (
    <div className="admin-management-content">
      <div className="management-header">
        <h2>Reports & Analytics</h2>
        <div className="management-actions">
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value)}
            className="filter-select"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {reports && (
        <div className="reports-grid">
          <div className="report-section">
            <h3>User Growth</h3>
            <div className="report-content">
              {reports.user_growth?.length > 0 ? (
                <div className="simple-chart">
                  {reports.user_growth.map((item, index) => (
                    <div key={index} className="chart-item">
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                      <span>{item.new_users} new users</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No user growth data available</p>
              )}
            </div>
          </div>
          
          <div className="report-section">
            <h3>Event Statistics</h3>
            <div className="report-content">
              {reports.event_stats?.length > 0 ? (
                <div className="stats-breakdown">
                  {reports.event_stats.map((stat, index) => (
                    <div key={index} className="stat-item">
                      <span className={`status-badge status-${stat.status}`}>
                        {stat.status}
                      </span>
                      <span>{stat.count} events</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No event statistics available</p>
              )}
            </div>
          </div>
          
          <div className="report-section">
            <h3>Revenue Tracking</h3>
            <div className="report-content">
              {reports.revenue_data?.length > 0 ? (
                <div className="simple-chart">
                  {reports.revenue_data.map((item, index) => (
                    <div key={index} className="chart-item">
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                      <span>${parseFloat(item.revenue).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No revenue data available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'users':
        return renderUserManagement();
      case 'events':
        return renderEventManagement();
      case 'logs':
        return renderSystemLogs();
      case 'system':
        return renderSystemHealth();
      case 'reports':
        return renderReports();
      default:
        return renderDashboard();
    }
  };

  return (
    <>
      <Header />
      <div className="admin-dashboard-container">
        {/* Notifications */}
        {error && (
          <div className="notification error">
            {error}
            <button onClick={() => setError('')} className="notification-close">×</button>
          </div>
        )}
        {success && (
          <div className="notification success">
            {success}
            <button onClick={() => setSuccess('')} className="notification-close">×</button>
          </div>
        )}

        <aside className="admin-sidebar">
          <div className="admin-header">
            <h1>🛡️ Admin Panel</h1>
            <p>System Administration</p>
          </div>
          
          <nav className="admin-nav">
            <ul>
              <li 
                className={activeTab === 'dashboard' ? 'active' : ''} 
                onClick={() => setActiveTab('dashboard')}
              >
                <span className="nav-icon">📊</span>
                <span>Dashboard</span>
              </li>
              <li 
                className={activeTab === 'users' ? 'active' : ''} 
                onClick={() => setActiveTab('users')}
              >
                <span className="nav-icon">👥</span>
                <span>User Management</span>
              </li>
              <li 
                className={activeTab === 'events' ? 'active' : ''} 
                onClick={() => setActiveTab('events')}
              >
                <span className="nav-icon">🎯</span>
                <span>Event Management</span>
              </li>
              <li 
                className={activeTab === 'logs' ? 'active' : ''} 
                onClick={() => setActiveTab('logs')}
              >
                <span className="nav-icon">📝</span>
                <span>System Logs</span>
              </li>
              <li 
                className={activeTab === 'system' ? 'active' : ''} 
                onClick={() => setActiveTab('system')}
              >
                <span className="nav-icon">⚡</span>
                <span>System Health</span>
              </li>
              <li 
                className={activeTab === 'reports' ? 'active' : ''} 
                onClick={() => setActiveTab('reports')}
              >
                <span className="nav-icon">📈</span>
                <span>Reports</span>
              </li>
            </ul>
          </nav>
        </aside>

        <main className="admin-main-content">
          {renderContent()}
        </main>
      </div>
   
    </>
  );
};

export default AdminDashboard;
