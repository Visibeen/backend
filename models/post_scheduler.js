'use strict';
const {
  Model
} = require('sequelize');
const User = require('./user')
module.exports = (sequelize, DataTypes) => {
  class post_scheduler extends Model {
    static associate(models) {
    }
  }
  post_scheduler.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      references: {
        model: User,
        key: "id"
      }
    },
    post_name: {
      type: DataTypes.STRING
    },
    post_url: {
      type: DataTypes.TEXT
    },
    scheduled_time:{
      type: DataTypes.DATE
    },
    title: {
      type: DataTypes.STRING
    },
    description: {
      type: DataTypes.TEXT
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.BIGINT,
      references: {
        model: User,
        key: "id"
      }
    },
    updated_by: {
      type: DataTypes.BIGINT,
      references: {
        model: User,
        key: "id"
      }
    },
  }, {
    sequelize,
    modelName: 'post_scheduler',
    underscored: true,
    tableName: 'post_schedulers',
    timestamps: true,
    freezeTableName: true,
    paranoid:false
  });
  return post_scheduler;
};