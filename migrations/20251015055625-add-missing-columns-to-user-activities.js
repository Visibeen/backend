'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Check if columns exist in user_activities table
    const tableDescription = await queryInterface.describeTable('user_activities');
    
    const columnsToAdd = [];
    
    if (!tableDescription.activity) {
      columnsToAdd.push({
        name: 'activity',
        definition: {
          type: Sequelize.STRING,
          allowNull: true
        }
      });
    }
    
    if (!tableDescription.activity_id) {
      columnsToAdd.push({
        name: 'activity_id',
        definition: {
          type: Sequelize.BIGINT,
          allowNull: true
        }
      });
    }
    
    if (!tableDescription.activity_type) {
      columnsToAdd.push({
        name: 'activity_type',
        definition: {
          type: Sequelize.STRING,
          allowNull: true
        }
      });
    }
    
    if (!tableDescription.previous_data) {
      columnsToAdd.push({
        name: 'previous_data',
        definition: {
          type: Sequelize.JSON,
          allowNull: true
        }
      });
    }
    
    if (!tableDescription.current_data) {
      columnsToAdd.push({
        name: 'current_data',
        definition: {
          type: Sequelize.JSON,
          allowNull: true
        }
      });
    }
    
    if (!tableDescription.updated_by) {
      columnsToAdd.push({
        name: 'updated_by',
        definition: {
          type: Sequelize.BIGINT,
          allowNull: true
        }
      });
    }
    
    if (!tableDescription.added_by) {
      columnsToAdd.push({
        name: 'added_by',
        definition: {
          type: Sequelize.BIGINT,
          allowNull: true
        }
      });
    }
    
    if (!tableDescription.action) {
      columnsToAdd.push({
        name: 'action',
        definition: {
          type: Sequelize.STRING,
          allowNull: true
        }
      });
    }
    
    // Add missing columns
    for (const column of columnsToAdd) {
      await queryInterface.addColumn('user_activities', column.name, column.definition);
      console.log(`✅ ${column.name} column added to user_activities table`);
    }
    
    if (columnsToAdd.length === 0) {
      console.log('ℹ️  All columns already exist in user_activities table');
    }
  },

  async down (queryInterface, Sequelize) {
    // Check if columns exist before removing
    const tableDescription = await queryInterface.describeTable('user_activities');
    
    const columnsToRemove = [
      'activity',
      'activity_id', 
      'activity_type',
      'previous_data',
      'current_data',
      'updated_by',
      'added_by',
      'action'
    ];
    
    for (const columnName of columnsToRemove) {
      if (tableDescription[columnName]) {
        await queryInterface.removeColumn('user_activities', columnName);
        console.log(`✅ ${columnName} column removed from user_activities table`);
      }
    }
  }
};
