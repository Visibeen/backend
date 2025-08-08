'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'reset_password_expires', {
      type: Sequelize.BIGINT,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'reset_password_expires', {
      type: Sequelize.BIGINT,
      allowNull: true,
    });
  }
};
