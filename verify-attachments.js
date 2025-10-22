/**
 * Verify attachments column was added to tasks table
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const config = require('./config/config.js');
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

async function verifyAttachments() {
  console.log('🔍 Verifying attachments column...\n');

  const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      dialect: dbConfig.dialect,
      logging: false
    }
  );

  try {
    await sequelize.authenticate();

    // Check if attachments column exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${dbConfig.database}'
        AND TABLE_NAME = 'tasks'
        AND COLUMN_NAME = 'attachments';
    `);

    if (results.length > 0) {
      console.log('✅ Attachments column exists in tasks table!\n');
      console.log('Column details:');
      console.log(results[0]);
      console.log('\n🎉 Database is ready for photo task workflow!');
    } else {
      console.log('❌ Attachments column NOT found in tasks table');
      console.log('Please run: npx sequelize-cli db:migrate');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

verifyAttachments();
