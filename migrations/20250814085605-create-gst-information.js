'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('gst_informations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.BIGINT
      },
      gst_details: {
        type: Sequelize.STRING
      },
      payment_details: {
        type: Sequelize.STRING
      },
      bank_name: {
        type: Sequelize.STRING
      },
      cheque_number: {
        type: Sequelize.STRING
      },
      payment_with_gst: {
        type: Sequelize.STRING
      },
      net_payment: {
        type: Sequelize.STRING
      },
      gst: {
        type: Sequelize.STRING
      },
      advance: {
        type: Sequelize.STRING
      },
      pending: {
        type: Sequelize.STRING
      },
      top_up_amount: {
        type: Sequelize.STRING
      },
      net_sale: {
        type: Sequelize.STRING
      },
      emi_date: {
        type: Sequelize.DATE
      },
      emi_payment_per_month: {
        type: Sequelize.STRING
      },
      esc_amount_number: {
        type: Sequelize.STRING
      },
      esc_bank_name: {
        type: Sequelize.STRING
      },
      esc_ifsc_code: {
        type: Sequelize.STRING
      },
      umrn_number: {
        type: Sequelize.STRING
      },
      contact_person: {
        type: Sequelize.STRING
      },
      contact_number: {
        type: Sequelize.STRING
      },
      alternative_contact_number: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.STRING
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
    await queryInterface.dropTable('gst_informations');
  }
};