'use strict';
const {
  Model
} = require('sequelize');
const Employee = require('./employee')
module.exports = (sequelize, DataTypes) => {
  class employee_role extends Model {
    static associate(models) {
    }
  }
  employee_role.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
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
    role_id: {
      type: DataTypes.BIGINT
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue:true
    }
  }, {
    sequelize,
    modelName: 'employee_role',
    tableName: 'employee_roles',
    timestamps: true,
    paranoid: false,
    underscored: true,
    freezeTableName: true,
  });
  return employee_role;
};