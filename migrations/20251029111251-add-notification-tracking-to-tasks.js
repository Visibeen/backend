'use strict';

/**
 * Migration: Add notification tracking fields to tasks table
 * @description Adds notifications_sent flag and notification_sent_at timestamp
 *              to prevent duplicate email/WhatsApp notifications
 * @date 2025-10-29
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Adding notification tracking fields to tasks table...');
    
    // Add notification_sent_at timestamp
    await queryInterface.addColumn('tasks', 'notification_sent_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when notification was sent to user'
    });
    console.log('✅ Added notification_sent_at column');

    // Add notifications_sent flag
    await queryInterface.addColumn('tasks', 'notifications_sent', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Flag indicating if notifications have been sent'
    });
    console.log('✅ Added notifications_sent column');

    console.log('✅ Migration completed successfully!');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('Removing notification tracking fields from tasks table...');
    
    await queryInterface.removeColumn('tasks', 'notification_sent_at');
    console.log('✅ Removed notification_sent_at column');
    
    await queryInterface.removeColumn('tasks', 'notifications_sent');
    console.log('✅ Removed notifications_sent column');

    console.log('✅ Rollback completed successfully!');
  }
};

