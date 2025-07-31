/**
 * Alternative fix for the attendee listing API endpoint
 * 
 * This code modifies the query to use u_org.email instead of o.email
 * and o.company_name instead of o.company
 * 
 * To use this:
 * 1. Find the BASE_ATTENDEE_QUERY in your backend code (in attendee-listings.js)
 * 2. Replace the "Organizer Information" section with this version
 */

// Modified BASE_ATTENDEE_QUERY that uses existing database columns
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
    u_org.email as organizer_email, -- Use email from users table joined to organizers
    o.company_name as organizer_company, -- Use company_name instead of company
    
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
    
    -- Rest of the query remains the same...
  FROM events e
  JOIN organizers o ON e.organizer_id = o.organizer_id
  JOIN users u_org ON o.user_id = u_org.user_id -- Join to get organizer's email from users table
  JOIN eventregistrations er ON e.event_id = er.event_id
  JOIN attendees a ON er.attendee_id = a.attendee_id
  JOIN users u ON a.user_id = u.user_id
  LEFT JOIN attendancelogs al ON er.registration_id = al.registration_id
  LEFT JOIN users sbu ON al.scanned_by_user_id = sbu.user_id
  LEFT JOIN tickettypes tt ON er.ticket_type_id = tt.ticket_type_id
  WHERE 1=1
`;

// Example implementation for an attendee-listing endpoint that uses this query
/**
 * app.get('/api/events/:id/attendee-listing', authenticateToken, async (req, res) => {
 *   try {
 *     const eventId = parseInt(req.params.id);
 *     
 *     // Build query with filters
 *     const { query, params } = buildAttendeeListingQuery(BASE_ATTENDEE_QUERY_FIXED, {
 *       eventId: eventId
 *     });
 *     
 *     // Execute query
 *     const result = await pool.query(query, params);
 *     
 *     return res.json({
 *       success: true,
 *       attendees: result.rows
 *     });
 *   } catch (error) {
 *     console.error('Error fetching event attendee listing:', error);
 *     return res.status(500).json({ 
 *       success: false, 
 *       message: 'Failed to fetch attendee listing',
 *       error: error.message
 *     });
 *   }
 * });
 */
