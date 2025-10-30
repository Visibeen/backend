'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class city extends Model {
    static associate(models) {
      city.belongsTo(models.state, { foreignKey: 'state_id', as: 'state' });
    }
  }
  city.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    state_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING(200),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'city',
    tableName: 'cities',
    underscored: true,
    timestamps: true,
    paranoid: false,
    freezeTableName: true
  });
  return city;
};

