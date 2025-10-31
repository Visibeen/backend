'use strict';

/**
 * Migration: Add post_content to tasks table
 * @description Adds post_content column to store GMB post data for photo/post tasks
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if column already exists
      const tableDescription = await queryInterface.describeTable('tasks');
      
      // Add post_content column if it doesn't exist
      if (!tableDescription.post_content) {
        await queryInterface.addColumn('tasks', 'post_content', {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'JSON string containing GMB post data (summary, topicType, media, etc.)'
        }, { transaction });

        console.log('✅ Added post_content column to tasks table');
      }

      // Add post_status column for tracking approval status
      if (!tableDescription.post_status) {
        await queryInterface.addColumn('tasks', 'post_status', {
          type: Sequelize.ENUM('pending', 'approved', 'rejected', 'posted'),
          allowNull: true,
          defaultValue: 'pending',
          comment: 'Status of post approval workflow'
        }, { transaction });

        console.log('✅ Added post_status column to tasks table');
      }

      await transaction.commit();
      console.log('✅ Migration completed: Added GMB post fields to tasks table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove post_content column
      await queryInterface.removeColumn('tasks', 'post_content', { transaction });
      
      // Remove post_status column
      await queryInterface.removeColumn('tasks', 'post_status', { transaction });

      await transaction.commit();
      console.log('✅ Rollback completed: Removed GMB post fields');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};

