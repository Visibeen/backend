'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cro_informations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.BIGINT
      },
      cro_employee_name: {
        type: Sequelize.STRING
      },
      seo_employee_name: {
        type: Sequelize.STRING
      },
      cro_category: {
        type: Sequelize.STRING
      },
      fa_account: {
        type: Sequelize.STRING
      },
      seo_post_period: {
        type: Sequelize.STRING
      },
      total_post: {
        type: Sequelize.STRING
      },
      report_period: {
        type: Sequelize.STRING
      },
      client_status: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING
      },
      password: {
        type: Sequelize.STRING
      },
      recory_email: {
        type: Sequelize.STRING
      },
      recory_password: {
        type: Sequelize.STRING
      },
      google_account: {
        type: Sequelize.STRING
      },
      location: {
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
    await queryInterface.dropTable('cro_informations');
  }
};