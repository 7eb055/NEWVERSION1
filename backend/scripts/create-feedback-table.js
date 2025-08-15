// create-feedback-table.js - Node.js script to create eventfeedback table
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'event_management_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '2312'
});

const createFeedbackTable = async () => {
  try {
    console.log('🔄 Creating eventfeedback table...');
    
    // Check if table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'eventfeedback'
      );
    `;
    
    const tableExists = await pool.query(tableExistsQuery);
    
    if (tableExists.rows[0].exists) {
      console.log('✅ eventfeedback table already exists');
      return;
    }
    
    // Create the table
    const createTableQuery = `
      -- Create the eventfeedback table
      CREATE TABLE eventfeedback (
        feedback_id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        attendee_id INTEGER NOT NULL REFERENCES attendees(attendee_id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        feedback_text TEXT,
        is_anonymous BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Ensure one feedback per attendee per event
        UNIQUE(event_id, attendee_id)
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ eventfeedback table created');
    
    // Create indexes
    const createIndexesQuery = `
      -- Create indexes for better performance
      CREATE INDEX idx_eventfeedback_event_id ON eventfeedback(event_id);
      CREATE INDEX idx_eventfeedback_attendee_id ON eventfeedback(attendee_id);
      CREATE INDEX idx_eventfeedback_rating ON eventfeedback(rating);
      CREATE INDEX idx_eventfeedback_created_at ON eventfeedback(created_at);
    `;
    
    await pool.query(createIndexesQuery);
    console.log('✅ Indexes created');
    
    // Create trigger function
    const createTriggerFunctionQuery = `
      CREATE OR REPLACE FUNCTION update_feedback_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await pool.query(createTriggerFunctionQuery);
    console.log('✅ Trigger function created');
    
    // Create trigger
    const createTriggerQuery = `
      CREATE TRIGGER trigger_update_feedback_updated_at
        BEFORE UPDATE ON eventfeedback
        FOR EACH ROW
        EXECUTE FUNCTION update_feedback_updated_at();
    `;
    
    await pool.query(createTriggerQuery);
    console.log('✅ Trigger created');
    
    // Insert sample data if events and attendees exist
    const eventCountQuery = 'SELECT COUNT(*) as count FROM events';
    const attendeeCountQuery = 'SELECT COUNT(*) as count FROM attendees';
    
    const eventCount = await pool.query(eventCountQuery);
    const attendeeCount = await pool.query(attendeeCountQuery);
    
    if (eventCount.rows[0].count > 0 && attendeeCount.rows[0].count > 0) {
      const sampleEventQuery = 'SELECT event_id FROM events ORDER BY event_id LIMIT 1';
      const sampleAttendeeQuery = 'SELECT attendee_id FROM attendees ORDER BY attendee_id LIMIT 1';
      
      const sampleEvent = await pool.query(sampleEventQuery);
      const sampleAttendee = await pool.query(sampleAttendeeQuery);
      
      if (sampleEvent.rows.length > 0 && sampleAttendee.rows.length > 0) {
        // For sample data, we'll use different attendee IDs if available
        const allAttendeesQuery = 'SELECT attendee_id FROM attendees ORDER BY attendee_id LIMIT 3';
        const allAttendees = await pool.query(allAttendeesQuery);
        
        if (allAttendees.rows.length >= 2) {
          // Insert feedback from multiple attendees
          for (let i = 0; i < Math.min(2, allAttendees.rows.length); i++) {
            const feedbackTexts = [
              'Amazing event! Great organization and fantastic speakers. Would definitely attend again!',
              'Really enjoyed the event. Good content and well organized.',
              'Excellent networking opportunities and valuable insights.',
              'Great venue and professional setup. Learned a lot!'
            ];
            
            const insertQuery = `
              INSERT INTO eventfeedback (event_id, attendee_id, rating, feedback_text, is_anonymous)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (event_id, attendee_id) DO NOTHING;
            `;
            
            await pool.query(insertQuery, [
              sampleEvent.rows[0].event_id,
              allAttendees.rows[i].attendee_id,
              4 + Math.floor(Math.random() * 2), // Rating 4 or 5
              feedbackTexts[i % feedbackTexts.length],
              Math.random() > 0.5 // Random anonymous flag
            ]);
          }
          
          console.log('✅ Sample feedback data inserted');
        }
      }
    } else {
      console.log('⚠️  No events or attendees found - skipping sample data');
    }
    
    // Verify table structure
    const verifyQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'eventfeedback' 
      ORDER BY ordinal_position;
    `;
    
    const verification = await pool.query(verifyQuery);
    console.log('✅ Table structure verification:');
    console.table(verification.rows);
    
    console.log('🎉 eventfeedback table setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating eventfeedback table:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run the migration
if (require.main === module) {
  createFeedbackTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createFeedbackTable;
