'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Replace 'YourTableName' with the real table name
    await queryInterface.addColumn('gst_informations', 'gst_name', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('gst_informations', 'gst_address', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('gst_informations', 'supply_state', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('gst_informations', 'gst_name');
    await queryInterface.removeColumn('gst_informations', 'gst_address');
    await queryInterface.removeColumn('gst_informations', 'supply_state');
  }
};