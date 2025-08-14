const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DatabaseMigrator {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'event_management_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async testConnection() {
    try {
      console.log('🔍 Testing database connection...');
      const result = await this.pool.query('SELECT NOW() as current_time, version() as db_version');
      console.log('✅ Database connected successfully');
      console.log(`📅 Current time: ${result.rows[0].current_time}`);
      console.log(`🗄️  Database version: ${result.rows[0].db_version.split(' ')[0]}`);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  async createMigrationsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        checksum VARCHAR(64),
        executed_at TIMESTAMP DEFAULT NOW(),
        execution_time_ms INTEGER,
        success BOOLEAN DEFAULT true
      );
    `;

    try {
      await this.pool.query(createTableQuery);
      console.log('✅ Migrations table ready');
    } catch (error) {
      console.error('❌ Failed to create migrations table:', error.message);
      throw error;
    }
  }

  async getExecutedMigrations() {
    const result = await this.pool.query(
      'SELECT filename, checksum FROM schema_migrations WHERE success = true ORDER BY executed_at'
    );
    return result.rows;
  }

  generateChecksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  async executeMigration(filename, content) {
    const checksum = this.generateChecksum(content);
    const startTime = Date.now();

    try {
      await this.pool.query('BEGIN');
      
      // Execute the migration
      await this.pool.query(content);
      
      // Record the migration
      await this.pool.query(
        'INSERT INTO schema_migrations (filename, checksum, execution_time_ms) VALUES ($1, $2, $3)',
        [filename, checksum, Date.now() - startTime]
      );
      
      await this.pool.query('COMMIT');
      console.log(`✅ Migration completed: ${filename} (${Date.now() - startTime}ms)`);
      return true;
    } catch (error) {
      await this.pool.query('ROLLBACK');
      
      // Record the failed migration
      await this.pool.query(
        'INSERT INTO schema_migrations (filename, checksum, execution_time_ms, success) VALUES ($1, $2, $3, $4)',
        [filename, checksum, Date.now() - startTime, false]
      );
      
      console.error(`❌ Migration failed: ${filename}`, error.message);
      throw error;
    }
  }

  async runMigrations() {
    try {
      console.log('🚀 Starting database migrations...');
      
      // Test connection first
      const connected = await this.testConnection();
      if (!connected) {
        throw new Error('Database connection failed');
      }

      // Create migrations table
      await this.createMigrationsTable();

      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations();
      const executed = executedMigrations.map(row => row.filename);

      console.log(`📋 Found ${executed.length} previously executed migrations`);

      // Look for migration files in multiple locations
      const migrationPaths = [
        path.join(__dirname, '../migrations'),
        path.join(__dirname, '../../migrations'),
        path.join(__dirname, '../../database/migrations'),
        path.join(__dirname, '../'), // Root directory for loose SQL files
      ];

      const migrationFiles = [];

      for (const migrationPath of migrationPaths) {
        if (fs.existsSync(migrationPath)) {
          const files = fs.readdirSync(migrationPath)
            .filter(file => file.endsWith('.sql'))
            .map(file => ({
              filename: file,
              path: path.join(migrationPath, file)
            }));
          migrationFiles.push(...files);
          console.log(`📁 Found ${files.length} SQL files in ${migrationPath}`);
        }
      }

      // Remove duplicates and sort
      const uniqueFiles = migrationFiles
        .filter((file, index, self) => self.findIndex(f => f.filename === file.filename) === index)
        .sort((a, b) => a.filename.localeCompare(b.filename));

      console.log(`📊 Total unique migration files found: ${uniqueFiles.length}`);

      let migrationsRun = 0;
      for (const file of uniqueFiles) {
        if (!executed.includes(file.filename)) {
          console.log(`🔄 Running migration: ${file.filename}`);
          
          const content = fs.readFileSync(file.path, 'utf8');
          await this.executeMigration(file.filename, content);
          migrationsRun++;
        } else {
          console.log(`⏭️  Skipping already executed: ${file.filename}`);
        }
      }

      console.log(`🎉 Migration process completed! ${migrationsRun} new migrations executed.`);
      return true;

    } catch (error) {
      console.error('❌ Migration process failed:', error.message);
      throw error;
    }
  }

  async getDbStatus() {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total_migrations,
          COUNT(CASE WHEN success = true THEN 1 END) as successful_migrations,
          COUNT(CASE WHEN success = false THEN 1 END) as failed_migrations,
          MAX(executed_at) as last_migration
        FROM schema_migrations
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error('Failed to get database status:', error.message);
      return null;
    }
  }

  async close() {
    await this.pool.end();
  }
}

async function runMigrations() {
  const migrator = new DatabaseMigrator();
  
  try {
    await migrator.runMigrations();
    
    const status = await migrator.getDbStatus();
    if (status) {
      console.log('\n📊 Database Status:');
      console.log(`   Total migrations: ${status.total_migrations}`);
      console.log(`   Successful: ${status.successful_migrations}`);
      console.log(`   Failed: ${status.failed_migrations}`);
      console.log(`   Last migration: ${status.last_migration || 'None'}`);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await migrator.close();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { DatabaseMigrator, runMigrations };
