'use strict';
const {
  Model
} = require('sequelize');
const User = require('./user')
const admin_pages = require('./admin_routes')
module.exports = (sequelize, DataTypes) => {
  class user_permission extends Model {
    static associate(models) {
    }
  }
  user_permission.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
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
    page_id: {
      allowNull: false,
      type: DataTypes.BIGINT,
      references: {
        model: admin_pages,
        key: "id"
      },
    },
    status: {
      type: DataTypes.BOOLEAN
    },
  }, {
    sequelize,
    modelName: 'user_permission',
    tableName: 'user_permissions',
    freezeTableName: true,
    paranoid: false,
    underscored: true,
    timestamps: true
  });
  return user_permission;
};