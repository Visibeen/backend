/**
 * Simple script to add is_visible_to_client column
 * Run: node add-column-simple.js
 */

require('dotenv').config();
const { sequelize } = require('./models');

async function addColumn() {
  try {
    console.log('🔄 Adding is_visible_to_client column...');
    
    // Add column using raw SQL
    await sequelize.query(`
      ALTER TABLE tasks 
      ADD COLUMN is_visible_to_client TINYINT(1) NOT NULL DEFAULT 1 
      COMMENT 'Whether task is visible to client on TaskManagement page'
    `);
    
    console.log('✅ Column added successfully!');
    
    // Verify
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'visibeen_gmb' 
      AND TABLE_NAME = 'tasks' 
      AND COLUMN_NAME = 'is_visible_to_client'
    `);
    
    if (results.length > 0) {
      console.log('✅ Verified: Column exists');
      console.log(results[0]);
    }
    
    process.exit(0);
  } catch (error) {
    if (error.message.includes('Duplicate column name')) {
      console.log('ℹ️  Column already exists!');
      process.exit(0);
    }
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addColumn();
