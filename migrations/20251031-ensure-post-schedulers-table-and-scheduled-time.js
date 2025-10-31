'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'post_schedulers';

    // Helper to check if table exists
    const tableExists = async () => {
      const tables = await queryInterface.showAllTables();
      const normalized = tables.map(t => (typeof t === 'object' ? t.tableName || Object.values(t)[0] : t));
      return normalized.includes(tableName);
    };

    const exists = await tableExists();

    if (!exists) {
      // Create full table with required columns
      await queryInterface.createTable(tableName, {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        user_id: {
          type: Sequelize.BIGINT
        },
        post_name: {
          type: Sequelize.STRING
        },
        post_url: {
          type: Sequelize.TEXT
        },
        scheduled_time: {
          type: Sequelize.DATE
        },
        title: {
          type: Sequelize.STRING
        },
        description: {
          type: Sequelize.TEXT
        },
        status: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
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
      return;
    }

    // Table exists; ensure scheduled_time column exists
    const definition = await queryInterface.describeTable(tableName);
    if (!definition.scheduled_time) {
      await queryInterface.addColumn(tableName, 'scheduled_time', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Safe down: remove scheduled_time column if exists
    const tableName = 'post_schedulers';
    try {
      const definition = await queryInterface.describeTable(tableName);
      if (definition.scheduled_time) {
        await queryInterface.removeColumn(tableName, 'scheduled_time');
      }
    } catch (e) {
      // If table doesn't exist, nothing to do
    }
  }
};


