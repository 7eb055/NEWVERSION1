require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function updateColumns() {
  const client = await pool.connect();
  try {
    // First check if columns exist
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'eventregistrations' 
      AND column_name IN ('qr_code', 'qr_data', 'qr_generated_at')
    `);
    
    console.log('Current columns:', result.rows);

    // Add or modify columns
    const queries = [
      `ALTER TABLE eventregistrations 
       ALTER COLUMN qr_code SET DATA TYPE TEXT`,
      
      `ALTER TABLE eventregistrations 
       ALTER COLUMN qr_data SET DATA TYPE TEXT`,
      
      `DO $$ 
       BEGIN 
         ALTER TABLE eventregistrations ADD COLUMN qr_generated_at TIMESTAMP;
         EXCEPTION WHEN duplicate_column THEN NULL;
       END $$;`
    ];

    for (const query of queries) {
      try {
        await client.query(query);
        console.log('Successfully executed:', query);
      } catch (err) {
        if (err.code === '42704') { // undefined_column
          // If column doesn't exist, create it
          const columnMatch = query.match(/ALTER COLUMN (\w+)/);
          if (columnMatch) {
            const columnName = columnMatch[1];
            await client.query(`ALTER TABLE eventregistrations ADD COLUMN ${columnName} TEXT`);
            console.log(`Created column ${columnName}`);
          }
        } else {
          throw err;
        }
      }
    }
    
    console.log('Successfully updated all columns');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

updateColumns();
