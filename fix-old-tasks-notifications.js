/**
 * Script to mark old pending tasks as notified
 * This prevents them from sending duplicate emails after the fix is deployed
 * 
 * Run this ONCE after deploying the notification tracking fix
 */

const { Task } = require('./models');
const { Op } = require('sequelize');

async function fixOldTasks() {
  try {
    console.log('🔧 Starting fix for old pending tasks...\n');

    // Find all pending tasks that have an assign_date but no notification tracking
    const oldTasks = await Task.findAll({
      where: {
        status: 'pending',
        assign_date: { [Op.ne]: null },
        [Op.or]: [
          { notifications_sent: null },
          { notifications_sent: false }
        ]
      },
      order: [['created_at', 'DESC']]
    });

    console.log(`📊 Found ${oldTasks.length} old pending tasks without notification tracking\n`);

    if (oldTasks.length === 0) {
      console.log('✅ No old tasks to fix. All tasks are properly tracked!');
      return;
    }

    // Show sample of tasks that will be updated
    console.log('📋 Sample of tasks to be marked as notified:');
    oldTasks.slice(0, 5).forEach(task => {
      console.log(`  - Task #${task.id}: "${task.title}" (created ${task.created_at})`);
    });
    
    if (oldTasks.length > 5) {
      console.log(`  ... and ${oldTasks.length - 5} more tasks\n`);
    } else {
      console.log('');
    }

    // Mark all old tasks as notified
    console.log('🔄 Marking old tasks as notified...');
    
    const updateResult = await Task.update(
      {
        notifications_sent: true,
        notification_sent_at: new Date()
      },
      {
        where: {
          status: 'pending',
          assign_date: { [Op.ne]: null },
          [Op.or]: [
            { notifications_sent: null },
            { notifications_sent: false }
          ]
        }
      }
    );

    const updatedCount = updateResult[0];

    console.log(`\n✅ Successfully marked ${updatedCount} old tasks as notified!`);
    console.log('✅ These tasks will NOT send duplicate emails anymore.\n');

    // Verify the fix
    const remainingUnnotified = await Task.count({
      where: {
        status: 'pending',
        assign_date: { [Op.ne]: null },
        notifications_sent: false
      }
    });

    console.log('📊 Post-fix verification:');
    console.log(`  - Old tasks marked as notified: ${updatedCount}`);
    console.log(`  - Remaining unnotified tasks: ${remainingUnnotified}`);
    
    if (remainingUnnotified === 0) {
      console.log('\n🎉 SUCCESS! All old pending tasks are now properly tracked.');
      console.log('   No duplicate emails will be sent for these tasks.\n');
    } else {
      console.log(`\n⚠️  Warning: ${remainingUnnotified} tasks still unnotified (likely newly created)`);
    }

  } catch (error) {
    console.error('❌ Error fixing old tasks:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  fixOldTasks()
    .then(() => {
      console.log('✅ Script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = fixOldTasks;

