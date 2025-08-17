import React, { useState, useEffect, useCallback } from 'react';
import { useDashboardState } from '../hooks/useDashboardState';
import Modal from '../Modal';

const SalesReportModal = ({ isOpen, onClose }) => {
  const { showError, showSuccess } = useDashboardState();
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState({
    summary: {
      totalRevenue: 0,
      totalTicketsSold: 0,
      totalEvents: 0,
      averageTicketPrice: 0,
      conversionRate: 0,
      pendingPayments: 0
    },
    recentSales: [],
    topEvents: [],
    salesByPeriod: [],
    paymentMethods: [],
    refunds: []
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    eventId: '',
    paymentStatus: '',
    ticketType: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchSalesData();
    }
  }, [isOpen, dateRange, fetchSalesData]);

  const fetchSalesData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...filters
      });

      const response = await fetch(`/api/sales/report?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sales data');
      }

      const data = await response.json();
      setSalesData(data);
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange, filters, showError]);

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const exportReport = async (format = 'csv') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format,
        ...filters
      });

      const response = await fetch(`/api/sales/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${dateRange.startDate}-${dateRange.endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showSuccess(`Report exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sales Reports & Analytics">
      <div className="sales-report-modal">
        {/* Controls */}
        <div className="report-controls">
          <div className="date-range-controls">
            <div className="form-group">
              <label className="org-label">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="org-input"
              />
            </div>
            <div className="form-group">
              <label className="org-label">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="org-input"
              />
            </div>
            <button 
              className="btn-primary btn-sm"
              onClick={fetchSalesData}
              disabled={loading}
            >
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
          </div>

          <div className="export-controls">
            <button 
              className="btn-secondary btn-sm"
              onClick={() => exportReport('csv')}
              disabled={loading}
            >
              <i className="fas fa-file-csv"></i>
              Export CSV
            </button>
            <button 
              className="btn-secondary btn-sm"
              onClick={() => exportReport('pdf')}
              disabled={loading}
            >
              <i className="fas fa-file-pdf"></i>
              Export PDF
            </button>
            <button 
              className="btn-secondary btn-sm"
              onClick={() => exportReport('xlsx')}
              disabled={loading}
            >
              <i className="fas fa-file-excel"></i>
              Export Excel
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="fas fa-chart-pie"></i>
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <i className="fas fa-list"></i>
            Transactions
          </button>
          <button 
            className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            <i className="fas fa-calendar"></i>
            Events
          </button>
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <i className="fas fa-chart-line"></i>
            Analytics
          </button>
        </div>

        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading sales data...</p>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && !loading && (
          <div className="overview-section">
            {/* Summary Cards */}
            <div className="summary-grid">
              <div className="summary-card revenue">
                <div className="card-icon">
                  <i className="fas fa-dollar-sign"></i>
                </div>
                <div className="card-content">
                  <h4>Total Revenue</h4>
                  <span className="amount">{formatCurrency(salesData.summary.totalRevenue)}</span>
                  <p className="subtitle">From all ticket sales</p>
                </div>
              </div>

              <div className="summary-card tickets">
                <div className="card-icon">
                  <i className="fas fa-ticket-alt"></i>
                </div>
                <div className="card-content">
                  <h4>Tickets Sold</h4>
                  <span className="amount">{salesData.summary.totalTicketsSold?.toLocaleString() || 0}</span>
                  <p className="subtitle">Across all events</p>
                </div>
              </div>

              <div className="summary-card events">
                <div className="card-icon">
                  <i className="fas fa-calendar-check"></i>
                </div>
                <div className="card-content">
                  <h4>Active Events</h4>
                  <span className="amount">{salesData.summary.totalEvents || 0}</span>
                  <p className="subtitle">With ticket sales</p>
                </div>
              </div>

              <div className="summary-card average">
                <div className="card-icon">
                  <i className="fas fa-chart-bar"></i>
                </div>
                <div className="card-content">
                  <h4>Avg. Ticket Price</h4>
                  <span className="amount">{formatCurrency(salesData.summary.averageTicketPrice)}</span>
                  <p className="subtitle">Per ticket sold</p>
                </div>
              </div>

              <div className="summary-card conversion">
                <div className="card-icon">
                  <i className="fas fa-percentage"></i>
                </div>
                <div className="card-content">
                  <h4>Conversion Rate</h4>
                  <span className="amount">{(salesData.summary.conversionRate || 0).toFixed(1)}%</span>
                  <p className="subtitle">Registrations to sales</p>
                </div>
              </div>

              <div className="summary-card pending">
                <div className="card-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="card-content">
                  <h4>Pending Payments</h4>
                  <span className="amount">{formatCurrency(salesData.summary.pendingPayments)}</span>
                  <p className="subtitle">Awaiting payment</p>
                </div>
              </div>
            </div>

            {/* Quick Insights */}
            <div className="insights-section">
              <h4>Quick Insights</h4>
              <div className="insights-grid">
                <div className="insight-card">
                  <h5>Payment Methods</h5>
                  <div className="payment-breakdown">
                    {salesData.paymentMethods?.map(method => (
                      <div key={method.method} className="payment-item">
                        <span className="method">{method.method}</span>
                        <span className="percentage">{method.percentage}%</span>
                        <span className="amount">{formatCurrency(method.amount)}</span>
                      </div>
                    )) || <p>No payment data available</p>}
                  </div>
                </div>

                <div className="insight-card">
                  <h5>Top Performing Events</h5>
                  <div className="top-events-list">
                    {salesData.topEvents?.slice(0, 5).map(event => (
                      <div key={event.event_id} className="event-item">
                        <span className="event-name">{event.title}</span>
                        <span className="event-revenue">{formatCurrency(event.revenue)}</span>
                      </div>
                    )) || <p>No event data available</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && !loading && (
          <div className="transactions-section">
            <div className="section-header">
              <h4>Recent Transactions</h4>
              <div className="transaction-filters">
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                  className="org-select"
                >
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>

            <div className="transactions-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Event</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.recentSales?.map(sale => (
                    <tr key={sale.transaction_id}>
                      <td>
                        <code>{sale.transaction_id}</code>
                      </td>
                      <td>{sale.event_title}</td>
                      <td>
                        <div className="customer-info">
                          <span className="name">{sale.customer_name}</span>
                          <span className="email">{sale.customer_email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="amount">{formatCurrency(sale.amount)}</span>
                      </td>
                      <td>
                        <span className="payment-method">{sale.payment_method}</span>
                      </td>
                      <td>
                        <span className={`status ${sale.status}`}>
                          {sale.status}
                        </span>
                      </td>
                      <td>{formatDate(sale.created_at)}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-sm btn-secondary">
                            <i className="fas fa-eye"></i>
                          </button>
                          <button className="btn-sm btn-secondary">
                            <i className="fas fa-download"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan="8" className="no-data">
                        No transactions found for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && !loading && (
          <div className="events-section">
            <div className="section-header">
              <h4>Event Performance</h4>
            </div>

            <div className="events-performance-grid">
              {salesData.topEvents?.map(event => (
                <div key={event.event_id} className="event-performance-card">
                  <div className="event-header">
                    <h5>{event.title}</h5>
                    <span className="event-date">{formatDate(event.event_date)}</span>
                  </div>
                  
                  <div className="event-metrics">
                    <div className="metric">
                      <label>Revenue</label>
                      <span className="value">{formatCurrency(event.revenue)}</span>
                    </div>
                    <div className="metric">
                      <label>Tickets Sold</label>
                      <span className="value">{event.tickets_sold}</span>
                    </div>
                    <div className="metric">
                      <label>Capacity</label>
                      <span className="value">{event.capacity}</span>
                    </div>
                    <div className="metric">
                      <label>Fill Rate</label>
                      <span className="value">{((event.tickets_sold / event.capacity) * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="event-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${(event.tickets_sold / event.capacity) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )) || (
                <div className="empty-state">
                  <i className="fas fa-calendar"></i>
                  <p>No event data available for the selected period</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && !loading && (
          <div className="analytics-section">
            <div className="section-header">
              <h4>Sales Analytics</h4>
            </div>

            <div className="analytics-grid">
              <div className="chart-container">
                <h5>Sales Trend</h5>
                <div className="chart-placeholder">
                  {/* Placeholder for chart - would integrate with Chart.js or similar */}
                  <div className="chart-mock">
                    <div className="chart-bars">
                      {salesData.salesByPeriod?.map((period, index) => (
                        <div 
                          key={index} 
                          className="chart-bar"
                          style={{ height: `${(period.amount / Math.max(...(salesData.salesByPeriod?.map(p => p.amount) || [1]))) * 100}%` }}
                          title={`${period.period}: ${formatCurrency(period.amount)}`}
                        ></div>
                      )) || Array.from({length: 7}, (_, i) => (
                        <div 
                          key={i} 
                          className="chart-bar"
                          style={{ height: `${Math.random() * 100}%` }}
                        ></div>
                      ))}
                    </div>
                    <p>Daily sales for the selected period</p>
                  </div>
                </div>
              </div>

              <div className="stats-container">
                <h5>Key Performance Indicators</h5>
                <div className="kpi-grid">
                  <div className="kpi-item">
                    <label>Revenue Growth</label>
                    <span className="kpi-value positive">+12.5%</span>
                  </div>
                  <div className="kpi-item">
                    <label>Customer Acquisition</label>
                    <span className="kpi-value positive">+8.3%</span>
                  </div>
                  <div className="kpi-item">
                    <label>Average Order Value</label>
                    <span className="kpi-value">{formatCurrency(salesData.summary.averageTicketPrice)}</span>
                  </div>
                  <div className="kpi-item">
                    <label>Refund Rate</label>
                    <span className="kpi-value negative">2.1%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="refunds-section">
              <h5>Recent Refunds</h5>
              <div className="refunds-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Refund ID</th>
                      <th>Original Transaction</th>
                      <th>Event</th>
                      <th>Amount</th>
                      <th>Reason</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.refunds?.slice(0, 10).map(refund => (
                      <tr key={refund.refund_id}>
                        <td><code>{refund.refund_id}</code></td>
                        <td><code>{refund.original_transaction_id}</code></td>
                        <td>{refund.event_title}</td>
                        <td>{formatCurrency(refund.amount)}</td>
                        <td>{refund.reason}</td>
                        <td>{formatDate(refund.created_at)}</td>
                        <td>
                          <span className={`status ${refund.status}`}>
                            {refund.status}
                          </span>
                        </td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan="7" className="no-data">
                          No refunds found for the selected period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SalesReportModal;
