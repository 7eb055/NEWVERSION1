#!/bin/bash

# Paystack Payment Integration Database Setup
# This script creates the necessary database tables and structure for Paystack payment integration

echo "🚀 Setting up Paystack Payment Integration Database..."

# Database connection parameters
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-event_management_db}
DB_USER=${DB_USER:-postgres}

echo "📊 Connecting to database: $DB_NAME on $DB_HOST:$DB_PORT"

# Execute the SQL script
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f create-payments-table.sql

if [ $? -eq 0 ]; then
    echo "✅ Payments table created successfully!"
    echo "✅ Indexes and triggers added!"
    echo "✅ Views created for payment summary!"
    echo ""
    echo "🎉 Paystack integration database setup complete!"
    echo ""
    echo "📋 What was created:"
    echo "   • payments table with Paystack-specific fields"
    echo "   • Indexes for better query performance"
    echo "   • Auto-update trigger for timestamps"
    echo "   • payment_summary view for reporting"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Update your .env file with Paystack secret key"
    echo "   2. Restart your backend server"
    echo "   3. Test the payment integration"
else
    echo "❌ Error creating payments table!"
    echo "Please check your database connection and try again."
    exit 1
fi
