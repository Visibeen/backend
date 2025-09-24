'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('leads', 'contact_person', {
      type: Sequelize.STRING,
      after: "is_tele"
    });
    await queryInterface.addColumn('leads', 'lead_source', {
      type: Sequelize.STRING,
      after: "contact_person"
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('leads', 'contact_person');
    await queryInterface.removeColumn('leads', 'lead_source');

  }

};