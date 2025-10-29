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

  // Configurable interval - defaults to 10 minutes
  // For testing, change to '*/1 * * * *' (every minute)
  const scheduleInterval = process.env.TASK_SCHEDULER_INTERVAL || '*/10 * * * *';
  
  cron.schedule(scheduleInterval, async () => {
    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    console.log(`\n⏰ [TASK SCHEDULER] Running at ${now}...`);
    
    try {
      // Call the controller function directly (no HTTP request needed)
      const result = await taskController.processScheduledNotifications(null, null);
      
      if (result.processedCount > 0) {
        console.log(`✅ [TASK SCHEDULER] Sent ${result.notificationsSent} notifications for ${result.processedCount} tasks`);
      } else {
        console.log(`✅ [TASK SCHEDULER] No scheduled tasks found at this time`);
      }
    } catch (error) {
      console.error('❌ [TASK SCHEDULER] Error processing scheduled notifications:', error.message);
      console.error('Error details:', error);
    }
  });

  console.log(`✅ [TASK SCHEDULER] Scheduler initialized - checking every 10 minutes`);
  console.log(`📋 [TASK SCHEDULER] Schedule pattern: ${scheduleInterval}`);
  console.log(`📧 [TASK SCHEDULER] Emails will be sent via ZeptoMail when tasks reach their scheduled time\n`);
};

module.exports = { initializeTaskScheduler };

