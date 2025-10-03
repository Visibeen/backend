'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('plans', 'billing_cycle', {
      type: Sequelize.ENUM('monthly', 'annually'),
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('plans', 'billing_cycle');
  }
};
