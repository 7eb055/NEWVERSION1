/**
 * Alternative fix for the attendee listing API endpoint - Registration Status
 * 
 * This code modifies the query to use er.status instead of er.registration_status
 * 
 * To use this:
 * 1. Find the BASE_ATTENDEE_QUERY in your backend code (in attendee-listings.js)
 * 2. Replace the "Registration Information" section with this version
 */

// Modified BASE_ATTENDEE_QUERY that uses status instead of registration_status
const BASE_ATTENDEE_QUERY_FIXED = `
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
    u_org.email as organizer_email,
    o.company_name as organizer_company,
    
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
    er.status as registration_status, -- Use status instead of registration_status
    er.cancellation_reason,
    
    -- Rest of the query remains the same...
`;

// Also update the buildAttendeeListingQuery function to use status instead of registration_status
/**
 * // Example update to buildAttendeeListingQuery function
 * if (filters.registrationStatus) {
 *   query += ` AND er.status = $${paramIndex}`; // Changed from er.registration_status
 *   params.push(filters.registrationStatus);
 *   paramIndex++;
 * }
 */
