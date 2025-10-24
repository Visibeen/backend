'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tasks', 'completion_data', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON string containing task completion data (description, photos, hours, etc.)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tasks', 'completion_data');
  }
};
