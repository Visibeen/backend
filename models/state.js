'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class state extends Model {
    static associate(models) {
      state.hasMany(models.city, { foreignKey: 'state_id', as: 'cities' });
    }
  }
  state.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true
    }
  }, {
    sequelize,
    modelName: 'state',
    tableName: 'states',
    underscored: true,
    timestamps: true,
    paranoid: false,
    freezeTableName: true
  });
  return state;
};

