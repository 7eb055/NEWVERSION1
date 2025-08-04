const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkTables() {
  const client = await pool.connect();
  try {
    console.log('Checking tables...');

    // Check eventcompanies table
    console.log('\nChecking eventcompanies table:');
    try {
      const eventCompaniesResult = await client.query('SELECT COUNT(*) FROM eventcompanies');
      console.log(`Total rows in eventcompanies: ${eventCompaniesResult.rows[0].count}`);
      
      const sampleEventCompanies = await client.query('SELECT * FROM eventcompanies LIMIT 1');
      if (sampleEventCompanies.rows.length > 0) {
        console.log('Sample eventcompanies row:', sampleEventCompanies.rows[0]);
      }
    } catch (error) {
      console.log('Error with eventcompanies:', error.message);
    }

    // Check companies table
    console.log('\nChecking companies table:');
    try {
      const companiesResult = await client.query('SELECT COUNT(*) FROM companies');
      console.log(`Total rows in companies: ${companiesResult.rows[0].count}`);
      
      const sampleCompanies = await client.query('SELECT * FROM companies LIMIT 1');
      if (sampleCompanies.rows.length > 0) {
        console.log('Sample companies row:', sampleCompanies.rows[0]);
      }
    } catch (error) {
      console.log('Error with companies:', error.message);
    }

    // Check table definitions
    console.log('\nTable Definitions:');
    const tableInfo = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('eventcompanies', 'companies')
      ORDER BY table_name, ordinal_position;
    `);

    const tables = {};
    tableInfo.rows.forEach(row => {
      if (!tables[row.table_name]) {
        tables[row.table_name] = [];
      }
      tables[row.table_name].push(row);
    });

    for (const [tableName, columns] of Object.entries(tables)) {
      console.log(`\n${tableName} columns:`);
      columns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();
