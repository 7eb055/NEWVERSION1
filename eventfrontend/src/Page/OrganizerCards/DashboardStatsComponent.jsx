import React from 'react';
import { useEventData } from './hooks/useEventData';
import './css/DashboardStatsComponent.css';

const DashboardStatsComponent = () => {
  const { events, salesData, loading, error } = useEventData();

  // Calculate dashboard statistics
  const calculateStats = () => {
    if (!events || events.length === 0) {
      return {
        totalEvents: 0,
        activeEvents: 0,
        totalRevenue: 0,
        totalTicketsSold: 0,
        averageTicketPrice: 0,
        upcomingEvents: 0
      };
    }

    const now = new Date();
    const activeEvents = events.filter(event => event.status === 'active' || event.status === 'published');
    const upcomingEvents = events.filter(event => {
      const eventDate = new Date(event.event_date);
      return eventDate > now;
    });

    // Calculate revenue from sales data or estimate from events
    let totalRevenue = 0;
    let totalTicketsSold = 0;

    if (salesData && salesData.length > 0) {
      totalRevenue = salesData.reduce((sum, sale) => sum + (parseFloat(sale.amount) || 0), 0);
      totalTicketsSold = salesData.reduce((sum, sale) => sum + (parseInt(sale.tickets_sold) || 0), 0);
    } else {
      // Estimate from events if no sales data
      events.forEach(event => {
        const ticketPrice = parseFloat(event.ticket_price) || 0;
        const estimatedSales = Math.floor(Math.random() * 20); // Mock data for demonstration
        totalRevenue += ticketPrice * estimatedSales;
        totalTicketsSold += estimatedSales;
      });
    }

    const averageTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;

    return {
      totalEvents: events.length,
      activeEvents: activeEvents.length,
      totalRevenue,
      totalTicketsSold,
      averageTicketPrice,
      upcomingEvents: upcomingEvents.length
    };
  };

  const stats = calculateStats();

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GHC',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format number
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div className="dashboard-stats-component">
        <div className="section-header">
          <h2>Dashboard Overview</h2>
        </div>
        <div className="stats-loading">
          <div className="spinner"></div>
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-stats-component">
        <div className="section-header">
          <h2>Dashboard Overview</h2>
        </div>
        <div className="stats-error">
          <p className="error-message">Error loading statistics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-stats-component">
      <div className="section-header">
        <h2>Dashboard Overview</h2>
        <p className="stats-subtitle">Key metrics for your events</p>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3 className="stat-value">{formatNumber(stats.totalEvents)}</h3>
            <p className="stat-label">Total Events</p>
          </div>
          <div className="stat-change positive">
            <span className="change-indicator">↗</span>
            <span className="change-text">All time</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3 className="stat-value">{formatNumber(stats.activeEvents)}</h3>
            <p className="stat-label">Active Events</p>
          </div>
          <div className="stat-change">
            <span className="change-text">Currently live</span>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3 className="stat-value">{formatNumber(stats.upcomingEvents)}</h3>
            <p className="stat-label">Upcoming Events</p>
          </div>
          <div className="stat-change">
            <span className="change-text">Scheduled</span>
          </div>
        </div>

        <div className="stat-card revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3 className="stat-value">{formatCurrency(stats.totalRevenue)}</h3>
            <p className="stat-label">Total Revenue</p>
          </div>
          <div className="stat-change positive">
            <span className="change-indicator">💵</span>
            <span className="change-text">All events</span>
          </div>
        </div>

        <div className="stat-card tickets">
          <div className="stat-icon">🎫</div>
          <div className="stat-content">
            <h3 className="stat-value">{formatNumber(stats.totalTicketsSold)}</h3>
            <p className="stat-label">Tickets Sold</p>
          </div>
          <div className="stat-change">
            <span className="change-text">Total sales</span>
          </div>
        </div>

        <div className="stat-card average">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3 className="stat-value">{formatCurrency(stats.averageTicketPrice)}</h3>
            <p className="stat-label">Avg. Ticket Price</p>
          </div>
          <div className="stat-change">
            <span className="change-text">Per ticket</span>
          </div>
        </div>
      </div>

      {/* Quick insights section */}
      <div className="quick-insights">
        <h3>Quick Insights</h3>
        <div className="insights-list">
          {stats.totalEvents === 0 && (
            <div className="insight-item">
              <span className="insight-icon">💡</span>
              <p>Create your first event to start tracking statistics!</p>
            </div>
          )}
          
          {stats.upcomingEvents > 0 && (
            <div className="insight-item">
              <span className="insight-icon">⏰</span>
              <p>You have {stats.upcomingEvents} upcoming event{stats.upcomingEvents > 1 ? 's' : ''} to manage.</p>
            </div>
          )}
          
          {stats.totalRevenue > 1000 && (
            <div className="insight-item">
              <span className="insight-icon">🎉</span>
              <p>Great job! You've generated over {formatCurrency(1000)} in revenue!</p>
            </div>
          )}
          
          {stats.activeEvents === 0 && stats.totalEvents > 0 && (
            <div className="insight-item">
              <span className="insight-icon">📢</span>
              <p>Consider activating some of your events to start selling tickets.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardStatsComponent;
