'use strict';

/**
 * Migration: Add is_visible_to_client to tasks table
 * @description Adds field to control whether task is visible to client
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add is_visible_to_client column
      await queryInterface.addColumn('tasks', 'is_visible_to_client', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether task is visible to client on TaskManagement page'
      }, { transaction });

      // Set all existing tasks as visible
      await queryInterface.sequelize.query(
        `UPDATE tasks SET is_visible_to_client = true WHERE is_visible_to_client IS NULL`,
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Migration completed: Added is_visible_to_client to tasks table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove is_visible_to_client column
      await queryInterface.removeColumn('tasks', 'is_visible_to_client', { transaction });

      await transaction.commit();
      console.log('✅ Rollback completed: Removed is_visible_to_client column');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
