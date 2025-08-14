const express = require('express');
const router = express.Router();

// Helper function to build attendee listing query
const buildAttendeeListingQuery = (baseQuery, filters = {}) => {
  let query = baseQuery;
  const params = [];
  let paramIndex = 1;

  // Add filters
  if (filters.eventId) {
    query += ` AND e.event_id = $${paramIndex}`;
    params.push(filters.eventId);
    paramIndex++;
  }

  if (filters.organizerId) {
    query += ` AND o.organizer_id = $${paramIndex}`;
    params.push(filters.organizerId);
    paramIndex++;
  }

  if (filters.attendanceStatus) {
    if (filters.attendanceStatus === 'checked_in') {
      query += ` AND al.log_id IS NOT NULL`;
    } else if (filters.attendanceStatus === 'registered') {
      query += ` AND al.log_id IS NULL`;
    }
  }

  if (filters.paymentStatus) {
    query += ` AND er.payment_status = $${paramIndex}`;
    params.push(filters.paymentStatus);
    paramIndex++;
  }

  if (filters.registrationStatus) {
    query += ` AND er.registration_status = $${paramIndex}`;
    params.push(filters.registrationStatus);
    paramIndex++;
  }

  // Date range filters
  if (filters.registrationDateFrom) {
    query += ` AND er.registration_date >= $${paramIndex}`;
    params.push(filters.registrationDateFrom);
    paramIndex++;
  }

  if (filters.registrationDateTo) {
    query += ` AND er.registration_date <= $${paramIndex}`;
    params.push(filters.registrationDateTo);
    paramIndex++;
  }

  // Sorting
  query += ` ORDER BY er.registration_date DESC`;

  // Pagination
  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(parseInt(filters.limit));
    paramIndex++;
  }

  if (filters.offset) {
    query += ` OFFSET $${paramIndex}`;
    params.push(parseInt(filters.offset));
  }

  return { query, params };
};

// Base attendee listing query template
const BASE_ATTENDEE_QUERY = `
  SELECT 
    -- Event Information
    e.event_id,
    e.event_name,
    e.event_date,
    e.event_time,
    e.end_date,
    e.end_time,
    e.venue_name,
    e.venue_address,
    e.event_type,
    e.category,
    e.ticket_price,
    e.max_attendees,
    
    -- Organizer Information
    o.organizer_id,
    o.organizer_name,
    o.email as organizer_email,
    o.company as organizer_company,
    
    -- Registration Information
    er.registration_id,
    er.registration_date,
    er.ticket_quantity,
    er.total_amount,
    er.payment_status,
    er.payment_method,
    er.payment_reference,
    er.special_requirements,
    er.qr_code,
    er.registration_status,
    er.cancellation_reason,
    
    -- Attendee Information
    a.attendee_id,
    a.full_name as attendee_name,
    u.email as attendee_email,
    a.phone as attendee_phone,
    a.date_of_birth,
    a.gender,
    a.interests,
    a.dietary_restrictions,
    a.accessibility_needs,
    a.emergency_contact_name,
    a.emergency_contact_phone,
    a.profile_picture_url,
    a.bio,
    a.social_media_links,
    a.notification_preferences,
    
    -- Attendance Tracking
    CASE WHEN al.log_id IS NOT NULL THEN true ELSE false END as check_in_status,
    al.log_id as attendance_id,
    al.check_in_time,
    al.check_out_time,
    al.scan_method,
    al.scanned_by_user_id,
    sbu.email as scanned_by_email,
    CASE 
      WHEN al.log_id IS NOT NULL THEN 'checked_in'
      ELSE 'registered'
    END as attendance_status,
    CASE 
      WHEN al.check_in_time IS NOT NULL AND al.check_out_time IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (al.check_out_time - al.check_in_time))/3600.0
      ELSE NULL
    END as attendance_duration_hours,
    
    -- Ticket Information
    tt.ticket_type_id,
    tt.type_name as ticket_type,
    tt.price as ticket_type_price,
    tt.description as ticket_description
    
  FROM events e
  JOIN organizers o ON e.organizer_id = o.organizer_id
  JOIN eventregistrations er ON e.event_id = er.event_id
  JOIN attendees a ON er.attendee_id = a.attendee_id
  JOIN users u ON a.user_id = u.user_id
  LEFT JOIN attendancelogs al ON er.registration_id = al.registration_id
  LEFT JOIN users sbu ON al.scanned_by_user_id = sbu.user_id
  LEFT JOIN tickettypes tt ON er.ticket_type_id = tt.ticket_type_id
  WHERE 1=1
`;

module.exports = {
  router,
  buildAttendeeListingQuery,
  BASE_ATTENDEE_QUERY
};
