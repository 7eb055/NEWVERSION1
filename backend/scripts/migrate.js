const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || (process.env.NODE_ENV === 'test' ? 'event_management_test' : 'event_management_db'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

async function runMigrations() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔄 Starting database migrations...');
    console.log(`📊 Database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection established');
    
    // Read and execute migration files
    const migrationsDir = path.join(__dirname, '../database/migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('📁 No migrations directory found. Creating tables from schema...');
      
      // Look for schema files in the root directory
      const schemaFiles = [
        'admin-schema.sql',
        'enhanced-event-system.sql',
        'create-tickettypes-table.sql',
        'ticket-tiers-schema.sql'
      ];
      
      for (const schemaFile of schemaFiles) {
        const schemaPath = path.join(__dirname, '../../', schemaFile);
        if (fs.existsSync(schemaPath)) {
          console.log(`📝 Executing ${schemaFile}...`);
          const schema = fs.readFileSync(schemaPath, 'utf8');
          await client.query(schema);
          console.log(`✅ ${schemaFile} executed successfully`);
        }
      }
    } else {
      // Execute migration files in order
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      for (const file of migrationFiles) {
        console.log(`📝 Executing migration: ${file}...`);
        const migration = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(migration);
        console.log(`✅ Migration ${file} completed`);
      }
    }
    
    client.release();
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
