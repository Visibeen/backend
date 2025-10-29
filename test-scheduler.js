/**
 * Manual Task Scheduler Test
 * Run this to manually trigger scheduled task notifications
 * 
 * Usage: node test-scheduler.js
 */

require('dotenv').config();
const taskController = require('./api/controllers/taskController');

const testScheduler = async () => {
  try {
    console.log('\n==============================================');
    console.log('⏰ MANUAL SCHEDULER TEST');
    console.log('==============================================\n');
    
    const now = new Date();
    console.log('Current Time:', now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    console.log('Checking for scheduled tasks...\n');
    
    // Call the scheduler function manually
    const result = await taskController.processScheduledNotifications(null, null);
    
    console.log('\n----------------------------------------------');
    console.log('RESULTS:');
    console.log('----------------------------------------------');
    console.log('Tasks Processed:', result.processedCount);
    console.log('Notifications Sent:', result.notificationsSent);
    console.log('----------------------------------------------\n');
    
    if (result.processedCount > 0) {
      console.log('✅ SUCCESS! Scheduled tasks have been processed.');
      console.log(`📧 ${result.notificationsSent} email/WhatsApp notifications sent.`);
    } else {
      console.log('ℹ️  No scheduled tasks found at this time.');
      console.log('\nThis could mean:');
      console.log('  - All tasks are scheduled for future dates/times');
      console.log('  - All pending tasks already had notifications sent');
      console.log('  - No tasks exist with assigned dates');
    }
    
    console.log('\n==============================================\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n==============================================');
    console.error('❌ SCHEDULER TEST FAILED');
    console.error('==============================================\n');
    console.error('Error:', error.message);
    console.error('\nFull error details:');
    console.error(error);
    console.error('\n==============================================\n');
    process.exit(1);
  }
};

// Run the test
console.log('\n🚀 Starting manual scheduler test...\n');
testScheduler();

