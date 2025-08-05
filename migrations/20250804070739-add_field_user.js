'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'google_access_token', {
      type: Sequelize.TEXT,
      allowNull: true,
      after:"token"
    });

    await queryInterface.addColumn('users', 'has_gmb_access', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after:"google_access_token"
    });

    await queryInterface.addColumn('users', 'last_login', {
      type: Sequelize.DATE,
      allowNull: true,
      after:"has_gmb_access"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'google_access_token');
    await queryInterface.removeColumn('users', 'has_gmb_access');
    await queryInterface.removeColumn('users', 'last_login');
  }
};
