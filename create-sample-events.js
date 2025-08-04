// Sample data creation script for testing the browse events page
// Run this after setting up your database to add test events

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'event_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password',
});

async function createSampleData() {
  console.log('🗄️  Creating sample data for browse events page...\n');

  try {
    // Check database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');

    // Create a test organizer if it doesn't exist
    console.log('\n👤 Creating test organizer...');
    
    // Clean up existing test data
    const testOrganizerEmail = 'organizer@test.com';
    await pool.query('DELETE FROM Events WHERE organizer_id IN (SELECT organizer_id FROM Organizers WHERE user_id IN (SELECT user_id FROM Users WHERE email = $1))', [testOrganizerEmail]);
    await pool.query('DELETE FROM Organizers WHERE user_id IN (SELECT user_id FROM Users WHERE email = $1)', [testOrganizerEmail]);
    await pool.query('DELETE FROM Users WHERE email = $1', [testOrganizerEmail]);

    // Create organizer user
    const organizerUserResult = await pool.query(`
      INSERT INTO Users (email, password, role_type, is_email_verified) 
      VALUES ($1, $2, $3, $4) 
      RETURNING user_id
    `, [testOrganizerEmail, 'hashedpassword123', 'organizer', true]);

    const organizerUserId = organizerUserResult.rows[0].user_id;

    // Create organizer profile
    const organizerResult = await pool.query(`
      INSERT INTO Organizers (user_id, full_name, company_name, business_address, phone) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING organizer_id
    `, [organizerUserId, 'John Smith', 'Tech Events Inc.', '123 Business Ave, Tech City', '+1-555-0123']);

    const organizerId = organizerResult.rows[0].organizer_id;
    console.log('✅ Test organizer created with ID:', organizerId);

    // Create sample events
    console.log('\n🎪 Creating sample events...');
    
    const sampleEvents = [
      {
        name: 'Tech Innovation Summit 2025',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        price: 99.99,
        maxAttendees: 200
      },
      {
        name: 'Web Development Workshop',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        price: 49.99,
        maxAttendees: 50
      },
      {
        name: 'AI & Machine Learning Conference',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
        price: 149.99,
        maxAttendees: 300
      },
      {
        name: 'Startup Networking Event',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        price: 0, // Free event
        maxAttendees: 100
      },
      {
        name: 'Cybersecurity Best Practices',
        date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 4 weeks from now
        price: 79.99,
        maxAttendees: 150
      }
    ];

    for (const event of sampleEvents) {
      const eventResult = await pool.query(`
        INSERT INTO Events (event_name, event_date, ticket_price, max_attendees, organizer_id, status) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING event_id, event_name
      `, [event.name, event.date, event.price, event.maxAttendees, organizerId, 'published']);

      console.log(`✅ Created event: ${eventResult.rows[0].event_name} (ID: ${eventResult.rows[0].event_id})`);
    }

    // Create a test attendee for registration testing
    console.log('\n👥 Creating test attendee...');
    
    const testAttendeeEmail = 'attendee@test.com';
    await pool.query('DELETE FROM Attendees WHERE user_id IN (SELECT user_id FROM Users WHERE email = $1)', [testAttendeeEmail]);
    await pool.query('DELETE FROM Users WHERE email = $1', [testAttendeeEmail]);

    const attendeeUserResult = await pool.query(`
      INSERT INTO Users (email, password, role_type, is_email_verified) 
      VALUES ($1, $2, $3, $4) 
      RETURNING user_id
    `, [testAttendeeEmail, 'hashedpassword123', 'attendee', true]);

    const attendeeUserId = attendeeUserResult.rows[0].user_id;

    await pool.query(`
      INSERT INTO Attendees (user_id, full_name, phone, date_of_birth) 
      VALUES ($1, $2, $3, $4)
    `, [attendeeUserId, 'Jane Doe', '+1-555-0456', '1990-05-15']);

    console.log('✅ Test attendee created');

    // Add some sample registrations to show realistic data
    console.log('\n📝 Adding sample registrations...');
    
    const eventsQuery = await pool.query('SELECT event_id FROM Events WHERE organizer_id = $1 LIMIT 3', [organizerId]);
    const attendeeQuery = await pool.query('SELECT attendee_id FROM Attendees WHERE user_id = $1', [attendeeUserId]);
    
    if (attendeeQuery.rows.length > 0) {
      const attendeeId = attendeeQuery.rows[0].attendee_id;
      
      for (let i = 0; i < Math.min(2, eventsQuery.rows.length); i++) {
        const eventId = eventsQuery.rows[i].event_id;
        
        try {
          await pool.query(`
            INSERT INTO EventRegistrations (event_id, attendee_id, registration_date, total_amount, payment_status, ticket_quantity)
            VALUES ($1, $2, NOW(), $3, $4, $5)
          `, [eventId, attendeeId, 49.99, 'completed', 1]);
          
          console.log(`✅ Added registration for event ID: ${eventId}`);
        } catch (error) {
          // Skip if registration already exists
          if (!error.message.includes('duplicate key')) {
            console.log(`⚠️  Could not add registration for event ${eventId}:`, error.message);
          }
        }
      }
    }

    console.log('\n🎉 Sample data creation completed!');
    console.log('\n📋 Summary:');
    console.log('   - Test organizer: organizer@test.com');
    console.log('   - Test attendee: attendee@test.com');
    console.log('   - 5 sample events created (all published)');
    console.log('   - 2 sample registrations added');
    console.log('\n🚀 You can now test the browse events page!');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    console.error('Make sure your database is set up correctly and the .env file has the right credentials.');
  } finally {
    await pool.end();
  }
}

// Run the script
createSampleData();
