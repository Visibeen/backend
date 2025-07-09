'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class user_role extends Model {
    static associate(models) {
    }
  }
  user_role.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    name: {
      type: DataTypes.STRING
    },
  }, {
    sequelize,
    freezeTableName: false,
    modelName: 'user_role',
    tableName: "user_roles",
    timestamps: true,
    paranoid: false,
    underscored: true
  });
  return user_role;
};