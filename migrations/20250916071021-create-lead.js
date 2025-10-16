'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('leads', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.BIGINT
      },
      employee_id: {
        type: Sequelize.INTEGER
      },
      is_tele: {
        type: Sequelize.BOOLEAN
      },
      business_name: {
        type: Sequelize.STRING
      },
      category: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING
      },
      website: {
        type: Sequelize.TEXT
      },
      first_name: {
        type: Sequelize.STRING
      },
      last_name: {
        type: Sequelize.STRING
      },
      contact_email: {
        type: Sequelize.STRING
      },
      phone_number: {
        type: Sequelize.STRING
      },
      alt_number: {
        type: Sequelize.STRING
      },
      tags: {
        type: Sequelize.STRING
      },
      type: {
        type: Sequelize.STRING
      },
      address_line1: {
        type: Sequelize.STRING
      },
      address_line2: {
        type: Sequelize.STRING
      },
      city: {
        type: Sequelize.STRING
      },
      state: {
        type: Sequelize.STRING
      },
      zip_code: {
        type: Sequelize.STRING
      },
      country: {
        type: Sequelize.STRING
      },
      comment: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.BOOLEAN
      },
      is_website_service: {
        type: Sequelize.BOOLEAN
      },
      is_gmb_services: {
        type: Sequelize.BOOLEAN
      },
      is_smo_services: {
        type: Sequelize.BOOLEAN
      },
      is_other_services: {
        type: Sequelize.BOOLEAN
      },
      is_deleted: {
        type: Sequelize.DATE
      },
      updated_by: {
        type: Sequelize.BIGINT
      },
      created_by: {
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
    await queryInterface.dropTable('leads');
  }
};