'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_activities', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.BIGINT
      },
      activity: {
        type: Sequelize.STRING
      },
      activity_id: {
        type: Sequelize.BIGINT
      },
      activity_type: {
        type: Sequelize.STRING
      },
      previous_data: {
        type: Sequelize.JSON
      },
      current_data: {
        type: Sequelize.JSON
      },
      updated_by: {
        type: Sequelize.BIGINT
      },
      added_by: {
        type: Sequelize.BIGINT
      },
      action: {
        type: Sequelize.STRING
      },
      created_at: {
        type: Sequelize.DATE
      },
      updated_at: {
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_activities');
  }
};