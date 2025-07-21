import React from 'react';

const VendorManagement = ({
  vendors,
  eventVendors,
  events,
  setSelectedEventForVendor,
  setShowVendorModal,
  showVendorModal,
  selectedEventForVendor,
  hireVendor,
  formatDate
}) => {
  return (
    <>
      <div className="vendor-management-section">
        <div className="section-header">
          <h2 className="section-title">
            <i className="fas fa-handshake"></i>
            Vendor Management
          </h2>
        </div>

        {/* Available Vendors */}
        <div className="available-vendors">
          <h3 className="subsection-title">
            <i className="fas fa-store"></i>
            Available Vendors
          </h3>
          
          <div className="vendors-grid">
            {vendors.map((vendor) => (
              <div key={vendor.id} className="vendor-card">
                <div className="vendor-header">
                  <h4 className="vendor-name">{vendor.name}</h4>
                  <span className="vendor-category">{vendor.category}</span>
                </div>
                
                <div className="vendor-details">
                  <div className="vendor-rating">
                    <i className="fas fa-star"></i>
                    <span>{vendor.rating}</span>
                  </div>
                  <div className="vendor-price">
                    <i className="fas fa-tag"></i>
                    <span>{vendor.price}</span>
                  </div>
                </div>
                
                <button 
                  className="hire-vendor-btn"
                  onClick={() => {
                    setSelectedEventForVendor(vendor);
                    setShowVendorModal(true);
                  }}
                >
                  <i className="fas fa-plus"></i>
                  Hire for Event
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Event Vendor Assignments */}
        <div className="event-vendors">
          <h3 className="subsection-title">
            <i className="fas fa-users-cog"></i>
            Event Vendor Assignments
          </h3>
          
          {eventVendors.length > 0 ? (
            <div className="vendor-assignments">
              {events.map((event) => {
                const assignedVendors = eventVendors.filter(ev => ev.eventId === event.id);
                
                return assignedVendors.length > 0 ? (
                  <div key={event.id} className="event-vendor-group">
                    <h4 className="event-title">{event.name}</h4>
                    <div className="assigned-vendors">
                      {assignedVendors.map((assignment, index) => (
                        <div key={index} className="assigned-vendor">
                          <span className="vendor-name">{assignment.vendorName}</span>
                          <span className="vendor-category">{assignment.category}</span>
                          <button className="remove-vendor-btn">
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <div className="no-vendor-assignments">
              <div className="no-assignments-icon">
                <i className="fas fa-handshake"></i>
              </div>
              <h4>No Vendor Assignments</h4>
              <p>Hire vendors for your events to manage services efficiently.</p>
            </div>
          )}
        </div>
      </div>

      {/* Vendor Selection Modal */}
      {showVendorModal && selectedEventForVendor && (
        <div className="modal-overlay" onClick={() => setShowVendorModal(false)}>
          <div className="vendor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Event for {selectedEventForVendor.name}</h3>
              <button 
                className="close-modal-btn"
                onClick={() => setShowVendorModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-content">
              <p>Choose which event you'd like to hire <strong>{selectedEventForVendor.name}</strong> for:</p>
              
              <div className="event-selection">
                {events.map((event) => (
                  <div key={event.id} className="event-option">
                    <div className="event-info">
                      <h4>{event.name}</h4>
                      <p>{formatDate(event.date)} • {event.location}</p>
                    </div>
                    <button 
                      className="select-event-btn"
                      onClick={() => hireVendor(selectedEventForVendor.id, event.id)}
                    >
                      <i className="fas fa-check"></i>
                      Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VendorManagement;
