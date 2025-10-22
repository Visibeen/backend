'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tasks', 'attachments', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Array of file paths/URLs for task attachments (photos, documents, etc.)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tasks', 'attachments');
  }
};
