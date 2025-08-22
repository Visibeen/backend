'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('posts', 'image', {
      type: Sequelize.TEXT,
      after:"status"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('posts', 'image');
  }
};
