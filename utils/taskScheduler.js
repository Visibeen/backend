/**
 * Task Scheduler
 * @description Handles scheduled task notifications using node-cron
 * @author Senior Backend Developer
 */

const cron = require('node-cron');
const axios = require('axios');

// Import the controller directly for internal use (no HTTP request)
const taskController = require('../api/controllers/taskController');

/**
 * Initialize task scheduler
 * This will run every 10 minutes to check for scheduled tasks
 */
const initializeTaskScheduler = () => {
  console.log('⏰ [TASK SCHEDULER] Initializing scheduled task notification system...');

  // Run every 10 minutes: '*/10 * * * *'
  // For testing, you can use '*/1 * * * *' (every minute)
  cron.schedule('*/10 * * * *', async () => {
    console.log('⏰ [TASK SCHEDULER] Running scheduled task notification check...');
    
    try {
      // Call the controller function directly (no HTTP request needed)
      const result = await taskController.processScheduledNotifications(null, null);
      
      console.log(`✅ [TASK SCHEDULER] Notification check complete: ${result.processedCount} tasks processed, ${result.notificationsSent} notifications sent`);
    } catch (error) {
      console.error('❌ [TASK SCHEDULER] Error processing scheduled notifications:', error.message);
    }
  });

  console.log('✅ [TASK SCHEDULER] Scheduler initialized - checking every 10 minutes');
};

module.exports = { initializeTaskScheduler };

