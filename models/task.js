'use strict';

/**
 * Task Model
 * @description Sequelize model for tasks table
 * @author Senior Backend Developer
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Task extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Association with User (client)
      Task.belongsTo(models.User, {
        foreignKey: 'assigned_to_client_id',
        as: 'assignedClient',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      });

      // Association with User (creator)
      Task.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }

    /**
     * Get task status display name
     */
    getStatusDisplay() {
      const statusMap = {
        'pending': 'Pending',
        'in-progress': 'In Progress',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
      };
      return statusMap[this.status] || this.status;
    }

    /**
     * Get priority display name
     */
    getPriorityDisplay() {
      const priorityMap = {
        'low': 'Low',
        'medium': 'Medium',
        'high': 'High'
      };
      return priorityMap[this.priority] || this.priority;
    }

    /**
     * Check if task is overdue
     */
    isOverdue() {
      if (!this.due_date || this.status === 'completed' || this.status === 'cancelled') {
        return false;
      }
      return new Date(this.due_date) < new Date();
    }

    /**
     * Get days until due date
     */
    getDaysUntilDue() {
      if (!this.due_date) return null;
      const today = new Date();
      const dueDate = new Date(this.due_date);
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }

    /**
     * Convert to JSON with computed fields
     */
    toJSON() {
      const values = Object.assign({}, this.get());
      return {
        ...values,
        isOverdue: this.isOverdue(),
        daysUntilDue: this.getDaysUntilDue(),
        statusDisplay: this.getStatusDisplay(),
        priorityDisplay: this.getPriorityDisplay()
      };
    }
  }

  Task.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Task title cannot be empty'
        },
        len: {
          args: [3, 255],
          msg: 'Task title must be between 3 and 255 characters'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assigned_to_client_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Client assignment is required'
        },
        isInt: {
          msg: 'Client ID must be a valid integer'
        }
      }
    },
    assigned_to_profile_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    assigned_to_profile_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'medium',
      validate: {
        isIn: {
          args: [['low', 'medium', 'high']],
          msg: 'Priority must be low, medium, or high'
        }
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'in-progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: {
          args: [['pending', 'in-progress', 'completed', 'cancelled']],
          msg: 'Status must be pending, in-progress, completed, or cancelled'
        }
      }
    },
    assign_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date when task is assigned to GMB profile'
    },
    assign_time: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: 'Time when task is assigned to GMB profile'
    },
    created_by_type: {
      type: DataTypes.ENUM('admin', 'ai'),
      allowNull: false,
      defaultValue: 'admin',
      comment: 'Whether task was created by admin or AI'
    },
    is_visible_to_client: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether task is visible to client on TaskManagement page'
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    estimated_hours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: {
          args: [0],
          msg: 'Estimated hours must be positive'
        }
      }
    },
    actual_hours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: {
          args: [0],
          msg: 'Actual hours must be positive'
        }
      }
    },
    tags: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completion_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON string containing task completion data (description, photos, hours, etc.)'
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of file paths/URLs for task attachments (photos, documents, etc.)'
    }
  }, {
    sequelize,
    modelName: 'Task',
    tableName: 'tasks',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeUpdate: (task, options) => {
        // Auto-set completed_at when status changes to completed
        if (task.changed('status') && task.status === 'completed' && !task.completed_at) {
          task.completed_at = new Date();
        }
        // Clear completed_at if status changes from completed
        if (task.changed('status') && task.status !== 'completed') {
          task.completed_at = null;
        }
      }
    }
  });

  return Task;
};
