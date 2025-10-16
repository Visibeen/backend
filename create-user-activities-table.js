/**
 * Script to create user_activities table
 * Run this with: node create-user-activities-table.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function createUserActivitiesTable() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'E2Edigitel',
      port: process.env.MYSQL_PORT || 3306
    });

    console.log('✅ Connected to database');

    // Check if table exists
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'user_activities'"
    );

    if (tables.length > 0) {
      console.log('⚠️  Table user_activities already exists');
      
      // Show table structure
      const [columns] = await connection.query('DESCRIBE user_activities');
      console.log('\nCurrent table structure:');
      console.table(columns);
      
      await connection.end();
      return;
    }

    console.log('📝 Creating user_activities table...');

    // Create the table
    await connection.query(`
      CREATE TABLE user_activities (
        id INT NOT NULL AUTO_INCREMENT,
        user_id BIGINT DEFAULT NULL,
        activity VARCHAR(255) DEFAULT NULL,
        activity_id BIGINT DEFAULT NULL,
        activity_type VARCHAR(255) DEFAULT NULL,
        previous_data JSON DEFAULT NULL,
        current_data JSON DEFAULT NULL,
        updated_by BIGINT DEFAULT NULL,
        added_by BIGINT DEFAULT NULL,
        action VARCHAR(255) DEFAULT NULL,
        created_at DATETIME DEFAULT NULL,
        updated_at DATETIME DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_user_id (user_id),
        KEY idx_activity_type (activity_type),
        KEY idx_activity_id (activity_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Table user_activities created successfully!');

    // Verify table was created
    const [newTables] = await connection.query(
      "SHOW TABLES LIKE 'user_activities'"
    );

    if (newTables.length > 0) {
      console.log('✅ Verification: Table exists');
      
      // Show table structure
      const [columns] = await connection.query('DESCRIBE user_activities');
      console.log('\nTable structure:');
      console.table(columns);
    }

    await connection.end();
    console.log('\n✅ Done! You can now restart your backend server.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the script
createUserActivitiesTable();
