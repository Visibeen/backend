'use strict';
const { Model } = require('sequelize');
const User = require('./user')
module.exports = (sequelize, DataTypes) => {
  class user_activity extends Model {
    static associate(models) {
    }
  }

  user_activity.init(
    {
      id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: User,
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      activity: {
        type: DataTypes.STRING,
      },
      activity_id: {
        type: DataTypes.BIGINT,
      },
      activity_type: {
        type: DataTypes.STRING,
      },
      previous_data: {
        type: DataTypes.JSON,
      },
      current_data: {
        type: DataTypes.JSON,
      },
      updated_by: {
        type: DataTypes.BIGINT,
        references: {
          model: User,
          key: 'id',
        },
      },
      added_by: {
        type: DataTypes.BIGINT,
        references: {
          model: User,
          key: 'id',
        },
      },
      action: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      modelName: 'user_activity',
      tableName: 'user_activities',
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  );

  return user_activity;
};
