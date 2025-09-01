'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('contact_us', 'date_and_time', {
      type: Sequelize.STRING,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('contact_us', 'date_and_time', {
      type: Sequelize.STRING,
    });
  }
};