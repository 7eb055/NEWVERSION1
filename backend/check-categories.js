require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkAndCreateCategories() {
  try {
    // First check if the table has the correct columns
    await pool.query(`
      ALTER TABLE eventcategories 
      ADD COLUMN IF NOT EXISTS category_name VARCHAR(100) NOT NULL,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS icon_class VARCHAR(50),
      ADD COLUMN IF NOT EXISTS color_code VARCHAR(7)
    `);

    // Check if any categories exist
    const result = await pool.query('SELECT * FROM eventcategories');
    console.log('Current categories:', result.rows);

    if (result.rows.length === 0) {
      // Insert default categories if none exist
      const categories = [
        {
          name: 'Conference',
          description: 'Professional conferences and summits',
          iconClass: 'fa-microphone',
          colorCode: '#4A90E2'
        },
        {
          name: 'Workshop',
          description: 'Interactive learning sessions',
          iconClass: 'fa-tools',
          colorCode: '#50E3C2'
        },
        {
          name: 'Seminar',
          description: 'Educational presentations',
          iconClass: 'fa-chalkboard-teacher',
          colorCode: '#F5A623'
        },
        {
          name: 'Networking',
          description: 'Business networking events',
          iconClass: 'fa-handshake',
          colorCode: '#9013FE'
        },
        {
          name: 'Training',
          description: 'Professional development sessions',
          iconClass: 'fa-graduation-cap',
          colorCode: '#D0021B'
        },
        {
          name: 'Expo',
          description: 'Exhibitions and trade shows',
          iconClass: 'fa-building',
          colorCode: '#7ED321'
        },
        {
          name: 'Social',
          description: 'Social gatherings and meetups',
          iconClass: 'fa-users',
          colorCode: '#F8E71C'
        },
        {
          name: 'Virtual',
          description: 'Online events and webinars',
          iconClass: 'fa-laptop',
          colorCode: '#4A4A4A'
        }
      ];

      for (const category of categories) {
        await pool.query(
          `INSERT INTO eventcategories (category_name, description, icon_class, color_code)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (category_name) DO NOTHING`,
          [category.name, category.description, category.iconClass, category.colorCode]
        );
      }
      console.log('✅ Default categories inserted successfully');

      // Verify categories were inserted
      const verification = await pool.query('SELECT * FROM eventcategories');
      console.log('Updated categories:', verification.rows);
    }
  } catch (error) {
    console.error('Error checking/creating categories:', error);
  } finally {
    await pool.end();
  }
}

checkAndCreateCategories();
