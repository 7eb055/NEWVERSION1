import React, { useState } from 'react';
import { DashboardStateContext } from './contexts/DashboardStateContext';

// DashboardStateProvider component that manages all UI state
const DashboardStateProvider = ({ children }) => {
  // Modal and form visibility state - explicit initialization to prevent TDZ issues
  const [showCreateForm, setShowCreateForm] = useState(() => false);
  const [showCompanyForm, setShowCompanyForm] = useState(() => false);
  const [showCompanyManagement, setShowCompanyManagement] = useState(() => false);
  const [showPeopleForm, setShowPeopleForm] = useState(() => false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(() => false);
  const [showTicketingForm, setShowTicketingForm] = useState(() => false);
  const [showAttendanceForm, setShowAttendanceForm] = useState(() => false);
  
  // Event management state - explicit initialization
  const [selectedEvent, setSelectedEvent] = useState(() => null);
  const [showEventDetails, setShowEventDetails] = useState(() => false);
  const [showEditForm, setShowEditForm] = useState(() => false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(() => false);
  const [eventToDelete, setEventToDelete] = useState(() => null);
  
  // Feedback and filtering state
  const [feedbackFilter, setFeedbackFilter] = useState({
    eventId: 'all',
    dateRange: 'all'
  });
  
  // Form data state - Updated to match normalized schema
  const [formData, setFormData] = useState({
    event_name: '',
    event_date: '',
    venue_name: '',
    venue_address: '',
    description: '',
    category: '',
    event_type: 'Conference',
    ticket_price: '',
    image_url: '',
    image_filename: '',
    image_type: '',
    image_size: '',
    image_mimetype: '',
    registration_deadline: '',
    refund_policy: '',
    terms_and_conditions: '',
    status: 'draft',
    is_public: true,
    requires_approval: false,
    max_tickets_per_person: 5,
    max_attendees: '',
    tags: ''
  });

  // Utility functions to close all modals
  const closeAllModals = () => {
    setShowCreateForm(false);
    setShowCompanyForm(false);
    setShowCompanyManagement(false);
    setShowPeopleForm(false);
    setShowRegistrationForm(false);
    setShowTicketingForm(false);
    setShowAttendanceForm(false);
    setShowEventDetails(false);
    setShowEditForm(false);
    setShowDeleteConfirm(false);
    setSelectedEvent(null);
    setEventToDelete(null);
  };

  // Reset form data to initial state
  const resetFormData = () => {
    setFormData({
      event_name: '',
      event_date: '',
      venue_name: '',
      venue_address: '',
      description: '',
      category: '',
      event_type: 'Conference',
      ticket_price: '',
      image_url: '',
      image_filename: '',
      image_type: '',
      image_size: '',
      image_mimetype: '',
      registration_deadline: '',
      refund_policy: '',
      terms_and_conditions: '',
      status: 'draft',
      is_public: true,
      requires_approval: false,
      max_tickets_per_person: 5,
      max_attendees: '',
      tags: ''
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle image upload changes
  const handleImageChange = (imageData) => {
    setFormData(prev => ({
      ...prev,
      image_url: imageData.url || '',
      image_filename: imageData.filename || '',
      image_type: imageData.type || '',
      image_size: imageData.size || '',
      image_mimetype: imageData.mimetype || ''
    }));
  };

  // Context value
  const contextValue = {
    // Modal and form visibility
    showCreateForm,
    setShowCreateForm,
    showCompanyForm,
    setShowCompanyForm,
    showCompanyManagement,
    setShowCompanyManagement,
    showPeopleForm,
    setShowPeopleForm,
    showRegistrationForm,
    setShowRegistrationForm,
    showTicketingForm,
    setShowTicketingForm,
    showAttendanceForm,
    setShowAttendanceForm,
    
    // Event management
    selectedEvent,
    setSelectedEvent,
    showEventDetails,
    setShowEventDetails,
    showEditForm,
    setShowEditForm,
    showDeleteConfirm,
    setShowDeleteConfirm,
    eventToDelete,
    setEventToDelete,
    
    // Feedback and filtering
    feedbackFilter,
    setFeedbackFilter,
    
    // Form data
    formData,
    setFormData,
    
    // Utility functions
    closeAllModals,
    resetFormData,
    handleInputChange,
    handleImageChange
  };

  return (
    <DashboardStateContext.Provider value={contextValue}>
      {children}
    </DashboardStateContext.Provider>
  );
};

export default DashboardStateProvider;
