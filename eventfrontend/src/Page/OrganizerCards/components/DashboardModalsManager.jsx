import React, { useState } from 'react';
import CompanySettingsModal from '../modals/CompanySettingsModal';
import PeopleTeamModal from '../modals/PeopleTeamModal';
import SalesReportModal from '../modals/SalesReportModal';
import FeedbackModal from '../modals/FeedbackModal';

const DashboardModalsManager = () => {
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (modalName) => {
    setActiveModal(modalName);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <>
      {/* Modal trigger buttons for dashboard action cards */}
      <div className="dashboard-modal-triggers">
        <button 
          className="modal-trigger-btn company-btn"
          onClick={() => openModal('company')}
          title="Company Settings & Information"
        >
          <div className="trigger-icon">
            <i className="fas fa-building"></i>
          </div>
          <div className="trigger-content">
            <h4>Company</h4>
            <p>Manage company profiles and information</p>
          </div>
          <div className="trigger-arrow">
            <i className="fas fa-arrow-right"></i>
          </div>
        </button>

        <button 
          className="modal-trigger-btn people-btn"
          onClick={() => openModal('people')}
          title="People & Team Management"
        >
          <div className="trigger-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="trigger-content">
            <h4>People</h4>
            <p>Manage team members and permissions</p>
          </div>
          <div className="trigger-arrow">
            <i className="fas fa-arrow-right"></i>
          </div>
        </button>

        <button 
          className="modal-trigger-btn sales-btn"
          onClick={() => openModal('sales')}
          title="Sales Reports & Analytics"
        >
          <div className="trigger-icon">
            <i className="fas fa-chart-line"></i>
          </div>
          <div className="trigger-content">
            <h4>Sales</h4>
            <p>View reports and analytics</p>
          </div>
          <div className="trigger-arrow">
            <i className="fas fa-arrow-right"></i>
          </div>
        </button>

        <button 
          className="modal-trigger-btn feedback-btn"
          onClick={() => openModal('feedback')}
          title="Customer Feedback & Reviews"
        >
          <div className="trigger-icon">
            <i className="fas fa-comments"></i>
          </div>
          <div className="trigger-content">
            <h4>Feedback</h4>
            <p>Manage customer feedback and reviews</p>
          </div>
          <div className="trigger-arrow">
            <i className="fas fa-arrow-right"></i>
          </div>
        </button>
      </div>

      {/* Modal Components */}
      <CompanySettingsModal 
        isOpen={activeModal === 'company'} 
        onClose={closeModal} 
      />
      
      <PeopleTeamModal 
        isOpen={activeModal === 'people'} 
        onClose={closeModal} 
      />
      
      <SalesReportModal 
        isOpen={activeModal === 'sales'} 
        onClose={closeModal} 
      />
      
      <FeedbackModal 
        isOpen={activeModal === 'feedback'} 
        onClose={closeModal} 
      />
    </>
  );
};

export default DashboardModalsManager;
