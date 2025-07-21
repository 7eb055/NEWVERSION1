import React from 'react';

const SalesSummary = ({ salesData, events }) => {
  return (
    <div className="sales-overview-section">
      <div className="section-header">
        <h2 className="section-title">
          <i className="fas fa-chart-line"></i>
          Sales Overview
        </h2>
      </div>

      <div className="sales-cards">
        {/* Global Income Card */}
        <div className="sales-card global-income">
          <div className="sales-card-header">
            <div className="sales-icon">
              <i className="fas fa-dollar-sign"></i>
            </div>
            <div className="sales-info">
              <h3>Total Revenue</h3>
              <p className="sales-amount">${salesData.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="sales-details">
            <span>Across {events.length} events</span>
          </div>
        </div>

        {/* Total Tickets Sold Card */}
        <div className="sales-card tickets-sold">
          <div className="sales-card-header">
            <div className="sales-icon">
              <i className="fas fa-ticket-alt"></i>
            </div>
            <div className="sales-info">
              <h3>Tickets Sold</h3>
              <p className="sales-amount">{salesData.eventSales.reduce((total, event) => total + event.ticketsSold, 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="sales-details">
            <span>Total tickets sold</span>
          </div>
        </div>

        {/* Average Revenue Card */}
        <div className="sales-card avg-revenue">
          <div className="sales-card-header">
            <div className="sales-icon">
              <i className="fas fa-chart-bar"></i>
            </div>
            <div className="sales-info">
              <h3>Avg. Revenue</h3>
              <p className="sales-amount">${events.length > 0 ? (salesData.totalIncome / events.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</p>
            </div>
          </div>
          <div className="sales-details">
            <span>Per event</span>
          </div>
        </div>
      </div>

      {/* Individual Sales Table */}
      <div className="individual-sales">
        <h3 className="subsection-title">
          <i className="fas fa-table"></i>
          Individual Event Sales
        </h3>
        
        {salesData.eventSales.length > 0 ? (
          <div className="sales-table-container">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Ticket Price</th>
                  <th>Tickets Sold</th>
                  <th>Revenue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {salesData.eventSales.map((eventSale, index) => (
                  <tr key={index}>
                    <td className="event-name-cell">
                      <div className="event-name-content">
                        <span className="event-name">{eventSale.eventName}</span>
                      </div>
                    </td>
                    <td className="price-cell">${eventSale.ticketPrice.toFixed(2)}</td>
                    <td className="tickets-cell">
                      <span className="tickets-count">{eventSale.ticketsSold}</span>
                    </td>
                    <td className="revenue-cell">
                      <span className="revenue-amount">${eventSale.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge ${eventSale.ticketsSold > 100 ? 'high-sales' : eventSale.ticketsSold > 50 ? 'medium-sales' : 'low-sales'}`}>
                        {eventSale.ticketsSold > 100 ? 'High Sales' : eventSale.ticketsSold > 50 ? 'Medium Sales' : 'Low Sales'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-sales-data">
            <div className="no-sales-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <h4>No Sales Data Available</h4>
            <p>Sales data will appear here once your events start selling tickets.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesSummary;
