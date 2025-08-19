'use strict';
const {
  Model
} = require('sequelize');
const User = require('./user.js');
module.exports = (sequelize, DataTypes) => {
  class holiday extends Model {
    static associate(models) {
    }
  }
  holiday.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
    },
    date: {
      type: DataTypes.STRING,
    },
    template: {
      type: DataTypes.INTEGER,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    created_by: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    updated_by: {
      type: DataTypes.INTEGER,
      references: {
        model: 'User',
        key: 'id'
      }
    },
    image: {
      type: DataTypes.TEXT,
    }
  }, {
    sequelize,
    modelName: 'holiday',
    tableName: 'holidays',
    timestamps: true,
    paranoid: false,
    underscored: true,
    freezeTableName: true

  });
  return holiday;
};