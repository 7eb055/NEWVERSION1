const { Pool } = require('pg');

class DatabaseHealthChecker {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'event_management_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 5,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 3000,
    });
  }

  async checkConnection() {
    try {
      const start = Date.now();
      const result = await this.pool.query('SELECT NOW() as current_time, version() as version');
      const duration = Date.now() - start;
      
      return {
        status: 'healthy',
        connection_time_ms: duration,
        current_time: result.rows[0].current_time,
        version: result.rows[0].version.split(' ')[0],
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connection_time_ms: null,
      };
    }
  }

  async checkTables() {
    try {
      const result = await this.pool.query(`
        SELECT 
          schemaname,
          tablename,
          hasindexes,
          hasrules,
          hastriggers
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);
      
      return {
        status: 'healthy',
        table_count: result.rows.length,
        tables: result.rows.map(row => ({
          name: row.tablename,
          has_indexes: row.hasindexes,
          has_rules: row.hasrules,
          has_triggers: row.hastriggers,
        })),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  async checkMigrations() {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total_migrations,
          COUNT(CASE WHEN success = true THEN 1 END) as successful,
          COUNT(CASE WHEN success = false THEN 1 END) as failed,
          MAX(executed_at) as last_migration
        FROM schema_migrations
      `);
      
      return {
        status: 'healthy',
        migrations: result.rows[0],
      };
    } catch (error) {
      // Migrations table might not exist yet
      return {
        status: 'warning',
        message: 'Migrations table not found - database might not be initialized',
        error: error.message,
      };
    }
  }

  async checkPerformance() {
    try {
      const queries = [
        { name: 'Simple SELECT', query: 'SELECT 1' },
        { name: 'Current Time', query: 'SELECT NOW()' },
        { name: 'Database Size', query: "SELECT pg_size_pretty(pg_database_size(current_database())) as size" },
      ];

      const results = [];
      for (const { name, query } of queries) {
        const start = Date.now();
        await this.pool.query(query);
        const duration = Date.now() - start;
        results.push({ name, duration_ms: duration });
      }
      
      return {
        status: 'healthy',
        performance_tests: results,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  async getConnectionStats() {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total_connections,
          COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections,
          COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      
      return {
        status: 'healthy',
        connections: result.rows[0],
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  async fullHealthCheck() {
    console.log('🏥 Starting comprehensive database health check...\n');
    
    const checks = {
      connection: await this.checkConnection(),
      tables: await this.checkTables(),
      migrations: await this.checkMigrations(),
      performance: await this.checkPerformance(),
      connections: await this.getConnectionStats(),
    };

    // Display results
    console.log('🔗 CONNECTION STATUS:');
    if (checks.connection.status === 'healthy') {
      console.log(`   ✅ Connected successfully (${checks.connection.connection_time_ms}ms)`);
      console.log(`   📅 Current time: ${checks.connection.current_time}`);
      console.log(`   🗄️  Database version: ${checks.connection.version}`);
    } else {
      console.log(`   ❌ Connection failed: ${checks.connection.error}`);
    }

    console.log('\n📊 TABLES STATUS:');
    if (checks.tables.status === 'healthy') {
      console.log(`   ✅ Found ${checks.tables.table_count} tables`);
      checks.tables.tables.forEach(table => {
        console.log(`   📋 ${table.name} (indexes: ${table.has_indexes ? '✅' : '❌'})`);
      });
    } else {
      console.log(`   ❌ Tables check failed: ${checks.tables.error}`);
    }

    console.log('\n🔄 MIGRATIONS STATUS:');
    if (checks.migrations.status === 'healthy') {
      console.log(`   ✅ Total migrations: ${checks.migrations.migrations.total_migrations}`);
      console.log(`   ✅ Successful: ${checks.migrations.migrations.successful}`);
      console.log(`   ${checks.migrations.migrations.failed > 0 ? '❌' : '✅'} Failed: ${checks.migrations.migrations.failed}`);
      console.log(`   📅 Last migration: ${checks.migrations.migrations.last_migration || 'None'}`);
    } else {
      console.log(`   ⚠️  ${checks.migrations.message || checks.migrations.error}`);
    }

    console.log('\n⚡ PERFORMANCE STATUS:');
    if (checks.performance.status === 'healthy') {
      checks.performance.performance_tests.forEach(test => {
        const emoji = test.duration_ms < 50 ? '🚀' : test.duration_ms < 100 ? '✅' : '⚠️';
        console.log(`   ${emoji} ${test.name}: ${test.duration_ms}ms`);
      });
    } else {
      console.log(`   ❌ Performance check failed: ${checks.performance.error}`);
    }

    console.log('\n🔌 CONNECTION POOL STATUS:');
    if (checks.connections.status === 'healthy') {
      console.log(`   ✅ Total connections: ${checks.connections.connections.total_connections}`);
      console.log(`   ⚡ Active connections: ${checks.connections.connections.active_connections}`);
      console.log(`   💤 Idle connections: ${checks.connections.connections.idle_connections}`);
    } else {
      console.log(`   ❌ Connection pool check failed: ${checks.connections.error}`);
    }

    // Overall status
    const healthyChecks = Object.values(checks).filter(check => check.status === 'healthy').length;
    const totalChecks = Object.keys(checks).length;
    
    console.log(`\n🏆 OVERALL STATUS: ${healthyChecks}/${totalChecks} checks passed`);
    
    if (healthyChecks === totalChecks) {
      console.log('🎉 Database is fully healthy and ready for production!');
      return { status: 'healthy', checks };
    } else {
      console.log('⚠️  Database has some issues that need attention');
      return { status: 'degraded', checks };
    }
  }

  async close() {
    await this.pool.end();
  }
}

async function healthCheck() {
  const checker = new DatabaseHealthChecker();
  
  try {
    const result = await checker.fullHealthCheck();
    
    if (result.status === 'healthy') {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  } finally {
    await checker.close();
  }
}

// Run health check if this script is executed directly
if (require.main === module) {
  healthCheck();
}

module.exports = { DatabaseHealthChecker, healthCheck };
