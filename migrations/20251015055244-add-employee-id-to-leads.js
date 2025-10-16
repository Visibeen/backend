'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if employee_id column exists
    const tableDescription = await queryInterface.describeTable('leads');
    
    if (!tableDescription.employee_id) {
      // Add employee_id column if it doesn't exist
      await queryInterface.addColumn('leads', 'employee_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'employees',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        after: 'user_id'
      });
      
      console.log('✅ employee_id column added to leads table');
    } else {
      console.log('ℹ️  employee_id column already exists in leads table');
    }
  },

  async down (queryInterface, Sequelize) {
    // Check if employee_id column exists before removing
    const tableDescription = await queryInterface.describeTable('leads');
    
    if (tableDescription.employee_id) {
      await queryInterface.removeColumn('leads', 'employee_id');
      console.log('✅ employee_id column removed from leads table');
    }
  }
};
