'use strict';

/**
 * Migration: Create tasks table
 * @description Creates the tasks table with all necessary fields for task management
 * @author Senior Backend Developer
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tasks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
        comment: 'Primary key for task'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Task title'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Detailed task description'
      },
      assigned_to_client_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'Client ID to whom task is assigned'
      },
      assigned_to_profile_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'GMB Profile/Account ID'
      },
      assigned_to_profile_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'GMB Profile business name for display'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'Task priority level'
      },
      status: {
        type: Sequelize.ENUM('pending', 'in-progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current task status'
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Task due date'
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Task category (e.g., Profile Management, Citations)'
      },
      estimated_hours: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Estimated hours to complete task'
      },
      actual_hours: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Actual hours spent on task'
      },
      tags: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Comma-separated tags'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes or comments'
      },
      created_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'Admin user who created the task'
      },
      updated_by: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'User who last updated the task'
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when task was completed'
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
      comment: 'Tasks assigned to clients and their GMB profiles'
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('tasks', ['assigned_to_client_id'], {
      name: 'idx_tasks_client_id'
    });

    await queryInterface.addIndex('tasks', ['status'], {
      name: 'idx_tasks_status'
    });

    await queryInterface.addIndex('tasks', ['priority'], {
      name: 'idx_tasks_priority'
    });

    await queryInterface.addIndex('tasks', ['due_date'], {
      name: 'idx_tasks_due_date'
    });

    await queryInterface.addIndex('tasks', ['created_by'], {
      name: 'idx_tasks_created_by'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tasks');
  }
};
