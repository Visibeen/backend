'use strict';

/**
 * Migration: Add created_by_type to tasks table
 * @description Adds field to distinguish admin-created tasks from AI-generated tasks
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add created_by_type column
      await queryInterface.addColumn('tasks', 'created_by_type', {
        type: Sequelize.ENUM('admin', 'ai'),
        allowNull: false,
        defaultValue: 'admin',
        comment: 'Whether task was created by admin or AI'
      }, { transaction });

      // Set all existing tasks as admin-created
      await queryInterface.sequelize.query(
        `UPDATE tasks SET created_by_type = 'admin' WHERE created_by_type IS NULL`,
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Migration completed: Added created_by_type to tasks table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove created_by_type column
      await queryInterface.removeColumn('tasks', 'created_by_type', { transaction });

      await transaction.commit();
      console.log('✅ Rollback completed: Removed created_by_type column');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
