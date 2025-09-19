'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meetings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.BIGINT
      },
      lead_id: {
        type: Sequelize.BIGINT
      },
      employee_id: {
        type: Sequelize.BIGINT
      },
      client_id: {
        type: Sequelize.BIGINT
      },
      comment: {
        type: Sequelize.STRING
      },
      title: {
        type: Sequelize.STRING
      },
      tags: {
        type: Sequelize.STRING
      },
      type: {
        type: Sequelize.STRING
      },
      gst_number: {
        type: Sequelize.STRING
      },
      meeting_with: {
        type: Sequelize.STRING
      },
      lat: {
        type: Sequelize.STRING
      },
      long: {
        type: Sequelize.STRING
      },
      presentation_show: {
        type: Sequelize.STRING
      },
      gmb_status: {
        type: Sequelize.BOOLEAN
      },
      telly_meeting: {
        type: Sequelize.STRING
      },
      meeting_date: {
        type: Sequelize.DATE
      },
      date_time: {
        type: Sequelize.DATE
      },
      month: {
        type: Sequelize.STRING
      },
      year: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.BOOLEAN
      },
      created_by: {
        type: Sequelize.BIGINT
      },
      updated_by: {
        type: Sequelize.BIGINT
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('meetings');
  }
};