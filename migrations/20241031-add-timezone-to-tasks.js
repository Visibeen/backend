'use strict';

/**
 * Migration: Add timezone column to tasks table
 * @description Adds timezone_offset column to store client's timezone offset in minutes
 * Example: IST (UTC+5:30) = +330 minutes, EST (UTC-5:00) = -300 minutes
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if column already exists
      const tableDescription = await queryInterface.describeTable('tasks');
      
      // Add timezone_offset column if it doesn't exist
      if (!tableDescription.timezone_offset) {
        await queryInterface.addColumn('tasks', 'timezone_offset', {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
          comment: 'Timezone offset in minutes from UTC (e.g., IST = +330, EST = -300)'
        }, { transaction });

        console.log('✅ Added timezone_offset column to tasks table');
      }

      await transaction.commit();
      console.log('✅ Migration completed: Added timezone support to tasks table');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove timezone_offset column
      await queryInterface.removeColumn('tasks', 'timezone_offset', { transaction });

      await transaction.commit();
      console.log('✅ Rollback completed: Removed timezone_offset column');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};

