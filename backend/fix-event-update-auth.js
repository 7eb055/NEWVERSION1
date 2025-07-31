// Fix for event update authorization issue

/*
This file contains a fix for the 403 Forbidden error when updating events.
The issue is in the event update route in server.js where it's comparing 
organizer_id with user_id, which are different values.

Here's how to fix it:

1. In server.js, find the PUT event update route (around line 1960-2000)
2. Replace the authorization check with the fix below that properly checks if the user
   is the organizer who created the event
*/

// FIND THIS CODE IN server.js:
/*
    // Check if user owns this event or is admin
    const eventCheck = await pool.query(
      'SELECT organizer_id FROM events WHERE event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (eventCheck.rows[0].organizer_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }
*/

// REPLACE IT WITH THIS CODE:
/*
    // Check if user owns this event or is admin
    const eventCheck = await pool.query(
      'SELECT e.event_id, e.organizer_id, o.user_id FROM events e 
       JOIN organizers o ON e.organizer_id = o.organizer_id
       WHERE e.event_id = $1',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if the authenticated user is the organizer of this event
    const isOwner = eventCheck.rows[0].user_id === req.user.user_id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      console.log('Auth failed for event update:', {
        eventId,
        authenticatedUserId: req.user.user_id,
        eventOrganizerUserId: eventCheck.rows[0].user_id,
        userRole: req.user.role
      });
      return res.status(403).json({ 
        message: 'Not authorized to update this event',
        detail: 'Only the event organizer or an admin can modify this event'
      });
    }
*/

console.log('File created with event update authorization fix instructions');
