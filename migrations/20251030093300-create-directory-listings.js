'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('directory_listings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      business_account_id: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      state_id: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      city_id: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      category_id: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      website: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      slug: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_suspended: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    await queryInterface.addIndex('directory_listings', ['state_id', 'city_id', 'category_id']);
    await queryInterface.addIndex('directory_listings', ['slug']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('directory_listings');
  }
};

