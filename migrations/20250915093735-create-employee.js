'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employees', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.BIGINT
      },
      email: {
        type: Sequelize.STRING
      },
      employee_code: {
        type: Sequelize.STRING
      },
      first_name: {
        type: Sequelize.STRING
      },
      last_name: {
        type: Sequelize.STRING
      },
      department: {
        type: Sequelize.STRING
      },
      official_email: {
        type: Sequelize.STRING
      },
      phone_number: {
        type: Sequelize.STRING
      },
      alternate_phone_number: {
        type: Sequelize.STRING
      },
      date_of_joining: {
        type: Sequelize.DATE
      },
      employee_type: {
        type: Sequelize.STRING
      },
      additional_tags: {
        type: Sequelize.STRING
      },
      family_member_name: {
        type: Sequelize.STRING
      },
      family_relation: {
        type: Sequelize.STRING
      },
      family_contact: {
        type: Sequelize.STRING
      },
      comment: {
        type: Sequelize.TEXT
      },
      permanent_address_line1: {
        type: Sequelize.STRING
      },
      permanent_address_line2: {
        type: Sequelize.STRING
      },
      permanent_city: {
        type: Sequelize.STRING
      },
      permanent_zip_code: {
        type: Sequelize.STRING
      },
      permanent_state: {
        type: Sequelize.STRING
      },
      permanent_country: {
        type: Sequelize.STRING
      },
      current_address_line1: {
        type: Sequelize.STRING
      },
      current_address_line2: {
        type: Sequelize.STRING
      },
      current_city: {
        type: Sequelize.STRING
      },
      current_zip_code: {
        type: Sequelize.STRING
      },
      current_state: {
        type: Sequelize.STRING
      },
      current_country: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.BOOLEAN
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
    await queryInterface.dropTable('employees');
  }
};