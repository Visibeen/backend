'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('business_acounts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.BIGINT
      },
      business_name: {
        type: Sequelize.STRING
      },
      business_category: {
        type: Sequelize.STRING
      },
      is_location: {
        type: Sequelize.BOOLEAN
      },
      lat: {
        type: Sequelize.STRING
      },
      long: {
        type: Sequelize.STRING
      },
      country: {
        type: Sequelize.STRING
      },
      street_address: {
        type: Sequelize.STRING
      },
      city: {
        type: Sequelize.STRING
      },
      state: {
        type: Sequelize.STRING
      },
      pin_code: {
        type: Sequelize.INTEGER
      },
      is_business: {
        type: Sequelize.BOOLEAN
      },
      contact_number: {
        type: Sequelize.STRING
      },
      select_area: {
        type: Sequelize.STRING
      },
      place_pin: {
        type: Sequelize.STRING
      },
      is_deliveries: {
        type: Sequelize.BOOLEAN
      },
      chat: {
        type: Sequelize.STRING
      },
      website: {
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
    await queryInterface.dropTable('business_acounts');
  }
};