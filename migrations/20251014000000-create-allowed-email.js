'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('allowed_emails', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      added_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    // Add index for email column for faster lookups
    await queryInterface.addIndex('allowed_emails', ['email'], {
      name: 'idx_allowed_emails_email',
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('allowed_emails');
  }
};
