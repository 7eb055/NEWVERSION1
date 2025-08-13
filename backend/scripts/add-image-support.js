const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const addImageSupport = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Adding image support columns to events table...');
    
    // Add new columns
    await client.query(`
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS image_filename VARCHAR(255),
      ADD COLUMN IF NOT EXISTS image_type VARCHAR(50) DEFAULT 'url',
      ADD COLUMN IF NOT EXISTS image_size INTEGER,
      ADD COLUMN IF NOT EXISTS image_mimetype VARCHAR(100)
    `);
    
    console.log('✅ Image support columns added successfully');
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_image_type ON events(image_type)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_image_filename ON events(image_filename)
    `);
    
    console.log('✅ Indexes created successfully');
    
    // Update existing records
    const result = await client.query(`
      UPDATE events 
      SET image_type = 'url' 
      WHERE image_url IS NOT NULL AND image_type IS NULL
    `);
    
    console.log(`✅ Updated ${result.rowCount} existing records`);
    
    // Add comments
    await client.query(`
      COMMENT ON COLUMN events.image_url IS 'Either full URL for external images or relative path for local uploads'
    `);
    
    await client.query(`
      COMMENT ON COLUMN events.image_filename IS 'Original filename for uploaded images'
    `);
    
    await client.query(`
      COMMENT ON COLUMN events.image_type IS 'Type of image: url (external) or file (local upload)'
    `);
    
    await client.query(`
      COMMENT ON COLUMN events.image_size IS 'File size in bytes for uploaded images'
    `);
    
    await client.query(`
      COMMENT ON COLUMN events.image_mimetype IS 'MIME type of uploaded images'
    `);
    
    console.log('✅ Column comments added successfully');
    console.log('🎉 Image support migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run the migration
addImageSupport()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
