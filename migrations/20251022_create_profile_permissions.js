'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table already exists
    const tables = await queryInterface.showAllTables();
    if (tables.includes('profile_permissions')) {
      console.log('✅ Table profile_permissions already exists, skipping...');
      return;
    }

    await queryInterface.createTable('profile_permissions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'User email who has permission'
      },
      profile_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'GMB location ID / profile ID'
      },
      added_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Admin user ID who granted this permission',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('profile_permissions', ['email']);
    await queryInterface.addIndex('profile_permissions', ['profile_id']);
    await queryInterface.addIndex('profile_permissions', ['email', 'profile_id'], {
      unique: true,
      name: 'unique_email_profile'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('profile_permissions');
  }
};
