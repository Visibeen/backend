'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'reset_password_token', {
      type: Sequelize.TEXT,
      after:"token"
    });

    await queryInterface.addColumn('users', 'reset_password_expires', {
      type: Sequelize.DATE,
      after:"google_access_token"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'reset_password_token');
    await queryInterface.removeColumn('users', 'reset_password_expires');
  }
};
