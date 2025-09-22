'use strict';
const {
  Model
} = require('sequelize');
const Employee = require('./employee')
const User = require('./user')
module.exports = (sequelize, DataTypes) => {
  class attendence extends Model {
    static associate(models) {
    }
  }
  attendence.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    employee_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Employee,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: User,
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    attendence_date: {
      type: DataTypes.DATE
    },
    type: {
      type: DataTypes.STRING
    },
    punch_time: {
      type: DataTypes.STRING
    },
    punch_out_time: {
      type: DataTypes.STRING
    },
    comment: {
      type: DataTypes.TEXT
    },
    month: {
      type: DataTypes.STRING
    },
    year: {
      type: DataTypes.STRING
    },
    form_date: {
      type: DataTypes.STRING
    },
    to_date: {
      type: DataTypes.STRING
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    updated_by: {
      type: DataTypes.BIGINT,
      references: {
        model: User,
        key: 'id',
      },
    },
    created_by: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'attendence',
    tableName: 'attendences',
    timestamps: true,
    paranoid: false,
    underscored: true,
    freezeTableName: true,
  });
  return attendence;
};