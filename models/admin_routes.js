'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class admin_routes extends Model {
    static associate(models) {
    }
  }
  admin_routes.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    slug: {
      type: DataTypes.STRING
    },
    page_name: {
      type: DataTypes.STRING
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'admin_routes',
    tableName: 'admin_routes',
    freezeTableName: true,
    paranoid: false,
    timestamps: true,
    underscored: true,

  });
  return admin_routes;
};