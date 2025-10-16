'use strict';

/**
 * Migration: Update tasks table - Replace due_date with assign_date and assign_time
 * @description Replaces due_date column with separate assign_date and assign_time columns
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if due_date column exists
      const tableDescription = await queryInterface.describeTable('tasks');
      
      // Add new columns
      await queryInterface.addColumn('tasks', 'assign_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date when task is assigned to GMB profile'
      }, { transaction });

      await queryInterface.addColumn('tasks', 'assign_time', {
        type: Sequelize.TIME,
        allowNull: true,
        comment: 'Time when task is assigned to GMB profile'
      }, { transaction });

      // If due_date exists, migrate data to assign_date
      if (tableDescription.due_date) {
        // Copy date part from due_date to assign_date
        await queryInterface.sequelize.query(
          `UPDATE tasks SET assign_date = DATE(due_date) WHERE due_date IS NOT NULL`,
          { transaction }
        );

        // Remove old due_date column
        await queryInterface.removeColumn('tasks', 'due_date', { transaction });
      }

      await transaction.commit();
      console.log('✅ Migration completed: Updated tasks table with assign_date and assign_time');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add back due_date column
      await queryInterface.addColumn('tasks', 'due_date', {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      // Migrate data back from assign_date to due_date
      await queryInterface.sequelize.query(
        `UPDATE tasks SET due_date = assign_date WHERE assign_date IS NOT NULL`,
        { transaction }
      );

      // Remove new columns
      await queryInterface.removeColumn('tasks', 'assign_date', { transaction });
      await queryInterface.removeColumn('tasks', 'assign_time', { transaction });

      await transaction.commit();
      console.log('✅ Rollback completed: Restored due_date column');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
