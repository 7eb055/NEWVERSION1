#!/bin/bash
set -e

echo "🚀 Starting Eventify Database Initialization..."

# Create database if it doesn't exist (already handled by POSTGRES_DB)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Ensure database is ready
    SELECT 'Database $POSTGRES_DB is ready for migrations' as status;
    
    -- Create extensions if needed
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOSQL

echo "✅ Database extensions created successfully"

# Run schema migrations in order
echo "🔄 Running database schema migrations..."

# Look for migration files in the migrations directory
if [ -d "/migrations" ]; then
    for file in /migrations/*.sql; do
        if [ -f "$file" ]; then
            echo "📝 Executing migration: $(basename "$file")"
            psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$file"
            echo "✅ Migration completed: $(basename "$file")"
        fi
    done
else
    echo "📁 No migrations directory found, checking root for schema files..."
    
    # Look for schema files in root directory
    for schema_file in \
        "/docker-entrypoint-initdb.d/../admin-schema.sql" \
        "/docker-entrypoint-initdb.d/../enhanced-event-system.sql" \
        "/docker-entrypoint-initdb.d/../create-tickettypes-table.sql" \
        "/docker-entrypoint-initdb.d/../ticket-tiers-schema.sql"; do
        
        if [ -f "$schema_file" ]; then
            echo "📝 Executing schema: $(basename "$schema_file")"
            psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$schema_file" || true
            echo "✅ Schema executed: $(basename "$schema_file")"
        fi
    done
fi

# Create a migrations tracking table
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create migrations tracking table
    CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        checksum VARCHAR(64),
        executed_at TIMESTAMP DEFAULT NOW(),
        execution_time_ms INTEGER
    );
    
    -- Insert initial migration record
    INSERT INTO schema_migrations (filename, checksum, execution_time_ms) 
    VALUES ('initial_setup', 'docker_init', 0) 
    ON CONFLICT (filename) DO NOTHING;
EOSQL

echo "🎉 Eventify Database initialization completed successfully!"
echo "📊 Database: $POSTGRES_DB"
echo "👤 User: $POSTGRES_USER"
echo "🔗 Ready for application connections"
