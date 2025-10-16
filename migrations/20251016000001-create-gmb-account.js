'use strict';

/**
 * Migration: Create gmb_accounts table
 * @description Stores GMB account information for users
 * @author Senior Backend Developer
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('gmb_accounts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
        comment: 'Primary key for GMB account'
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'User ID who owns this GMB account'
      },
      account_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'GMB Account ID from Google'
      },
      location_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'GMB Location ID from Google'
      },
      business_name: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Business name from GMB'
      },
      location_name: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Location name from GMB'
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Business address'
      },
      phone_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Business phone number'
      },
      website: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Business website'
      },
      category: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Primary business category'
      },
      location_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Complete location data from GMB API'
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the GMB location is verified'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this account is active'
      },
      last_synced_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time data was synced from GMB'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      comment: 'Stores GMB account information for users'
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('gmb_accounts', ['user_id'], {
      name: 'idx_gmb_accounts_user_id'
    });

    await queryInterface.addIndex('gmb_accounts', ['account_id'], {
      name: 'idx_gmb_accounts_account_id'
    });

    await queryInterface.addIndex('gmb_accounts', ['location_id'], {
      name: 'idx_gmb_accounts_location_id'
    });

    await queryInterface.addIndex('gmb_accounts', ['is_active'], {
      name: 'idx_gmb_accounts_is_active'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('gmb_accounts');
  }
};
