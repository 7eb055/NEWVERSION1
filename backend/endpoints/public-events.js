// Endpoint for public events
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all published events with additional details for attendee dashboard
router.get('/', async (req, res) => {
  try {
    const { 
      search = '', 
      category = '', 
      start_date = '', 
      end_date = '', 
      limit = 20, 
      page = 1 
    } = req.query;
    
    const offset = (page - 1) * limit;
    let params = ['published']; // Default status filter
    let paramIndex = 1;
    
    let query = `
      SELECT e.event_id, e.event_name, e.event_date, e.event_time,
             e.venue_name, e.venue_address, e.description,
             e.ticket_price, e.event_type, e.category,
             e.image_url, e.registration_deadline,
             e.tags, e.max_attendees,
             o.organizer_name, o.company_name,
             COUNT(DISTINCT er.registration_id) as attendee_count,
             COALESCE(AVG(ef.rating), 0) as average_rating,
             COUNT(DISTINCT ef.feedback_id) as review_count
      FROM events e
      LEFT JOIN organizers o ON e.organizer_id = o.organizer_id
      LEFT JOIN eventregistrations er ON e.event_id = er.event_id
      LEFT JOIN eventfeedback ef ON e.event_id = ef.event_id
      WHERE e.status = $${paramIndex++}
    `;
    
    // Add search filter if provided
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (e.event_name ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex})`;
      paramIndex++;
    }
    
    // Add category filter if provided
    if (category) {
      params.push(category);
      query += ` AND e.category = $${paramIndex}`;
      paramIndex++;
    }
    
    // Add date range filters if provided
    if (start_date) {
      params.push(start_date);
      query += ` AND e.event_date >= $${paramIndex}`;
      paramIndex++;
    }
    
    if (end_date) {
      params.push(end_date);
      query += ` AND e.event_date <= $${paramIndex}`;
      paramIndex++;
    }
    
    // Complete the query with grouping, ordering, and pagination
    query += `
      GROUP BY e.event_id, o.organizer_name, o.company_name
      ORDER BY e.event_date ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    // Execute the main query for events
    const eventsResult = await pool.query(query, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT e.event_id) as total
      FROM events e
      WHERE e.status = $1
      ${search ? `AND (e.event_name ILIKE $2 OR e.description ILIKE $2)` : ''}
      ${category ? `AND e.category = $${search ? 3 : 2}` : ''}
    `;
    
    const countParams = ['published'];
    if (search) countParams.push(`%${search}%`);
    if (category) countParams.push(category);
    
    const countResult = await pool.query(countQuery, countParams);
    const totalEvents = parseInt(countResult.rows[0].total);
    
    // Return formatted response with pagination info
    res.json({
      events: eventsResult.rows,
      pagination: {
        total: totalEvents,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalEvents / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching events for attendee dashboard:', error);
    res.status(500).json({ 
      message: 'Error fetching events', 
      error: error.message 
    });
  }
});

// GET a single event by ID with detailed information
router.get('/:eventId', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    
    // Query to get detailed event information
    const query = `
      SELECT 
        e.event_id, e.event_name, e.event_date, e.event_time, 
        e.end_date, e.end_time, e.venue_name, e.venue_address, 
        e.description, e.ticket_price, e.event_type, 
        e.category, e.tags, e.image_url, e.registration_deadline,
        e.refund_policy, e.terms_and_conditions, e.status,
        e.is_public, e.requires_approval, e.max_tickets_per_person,
        o.organizer_id, o.organizer_name, o.bio AS organizer_bio, 
        o.company_name, o.phone as contact_phone,
        ec.company_id, ec.company_name AS sponsoring_company, 
        ec.address AS company_address, ec.contact_info,
        COUNT(DISTINCT er.registration_id) as attendee_count,
        COALESCE(AVG(ef.rating), 0) as average_rating,
        COUNT(DISTINCT ef.feedback_id) as review_count
      FROM events e
      LEFT JOIN organizers o ON e.organizer_id = o.organizer_id
      LEFT JOIN eventcompanies ec ON o.company_id = ec.company_id
      LEFT JOIN eventregistrations er ON e.event_id = er.event_id
      LEFT JOIN eventfeedback ef ON e.event_id = ef.event_id
      WHERE e.event_id = $1 AND e.status = 'published'
      GROUP BY e.event_id, o.organizer_id, ec.company_id
    `;
    
    const eventResult = await pool.query(query, [eventId]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const event = eventResult.rows[0];
    
    // Get reviews/feedback for this event
    const reviewsQuery = `
      SELECT 
        ef.feedback_id, ef.rating, ef.feedback_text as comment, ef.created_at,
        ef.is_anonymous,
        CASE WHEN ef.is_anonymous THEN 'Anonymous' ELSE a.full_name END AS attendee_name
      FROM eventfeedback ef
      LEFT JOIN attendees a ON ef.attendee_id = a.attendee_id
      WHERE ef.event_id = $1
      ORDER BY ef.created_at DESC
      LIMIT 10
    `;
    
    const reviewsResult = await pool.query(reviewsQuery, [eventId]);
    
    // Get upcoming events from the same organizer
    const organizerEventsQuery = `
      SELECT 
        e.event_id, e.event_name, e.event_date, e.venue_name,
        e.image_url, e.category
      FROM events e
      WHERE e.organizer_id = $1 
        AND e.status = 'published'
        AND e.event_id != $2
        AND e.event_date >= CURRENT_DATE
      ORDER BY e.event_date ASC
      LIMIT 3
    `;
    
    const organizerEventsResult = await pool.query(organizerEventsQuery, [event.organizer_id, eventId]);
    
    // Return the complete event details
    res.json({
      event,
      reviews: reviewsResult.rows,
      otherEvents: organizerEventsResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({ 
      message: 'Error fetching event details', 
      error: error.message 
    });
  }
});

module.exports = router;
