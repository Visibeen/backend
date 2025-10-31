'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('tasks', 'completion_data', {
      type: Sequelize.TEXT('long'), // LONGTEXT
      allowNull: true,
      comment: 'JSON string containing task completion data (may include large data like images)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('tasks', 'completion_data', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON string containing task completion data'
    });
  }
};

