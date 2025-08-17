import React from 'react';
import {
  CreateEventModal,
  CompanyRegistrationModal,
  ManualRegistrationModal,
  TicketingModal,
  AttendanceModal
} from './modals';

/**
 * ModalManager - Centralized modal management component
 * This component renders all modals and handles their state through the DashboardStateProvider
 * Each modal is responsible for its own visibility state management
 */
const ModalManager = () => {
  return (
    <>
      {/* Event Management Modals */}
      <CreateEventModal />
      
      {/* Registration Modals */}
      <CompanyRegistrationModal />
      <ManualRegistrationModal />
      
      {/* Ticketing & Attendance Modals */}
      <TicketingModal />
      <AttendanceModal />
      
      {/* Additional modals can be added here as needed */}
    </>
  );
};

export default ModalManager;
