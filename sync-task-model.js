/**
 * Temporary script to sync task model with database
 * Run: node sync-task-model.js
 */

require('dotenv').config();
const { sequelize } = require('./models');
const Task = require('./models').Task;

async function syncTaskModel() {
  try {
    console.log('🔄 Syncing Task model with database...');
    
    // Sync only the Task model (alter: true will add missing columns)
    await Task.sync({ alter: true });
    
    console.log('✅ Task model synced successfully!');
    console.log('✅ is_visible_to_client column should now exist');
    
    // Verify
    const tableInfo = await sequelize.query(
      `DESCRIBE tasks`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    const visibilityColumn = tableInfo.find(col => col.Field === 'is_visible_to_client');
    
    if (visibilityColumn) {
      console.log('✅ Verified: is_visible_to_client column exists');
      console.log('   Type:', visibilityColumn.Type);
      console.log('   Default:', visibilityColumn.Default);
    } else {
      console.log('❌ Column not found!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing model:', error);
    process.exit(1);
  }
}

syncTaskModel();
