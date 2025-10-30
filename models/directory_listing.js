'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class directory_listing extends Model {
    static associate(models) {
      directory_listing.belongsTo(models.state, { foreignKey: 'state_id', as: 'state' });
      directory_listing.belongsTo(models.city, { foreignKey: 'city_id', as: 'city' });
      directory_listing.belongsTo(models.category, { foreignKey: 'category_id', as: 'category' });
      directory_listing.belongsTo(models.business_account, { foreignKey: 'business_account_id', as: 'businessAccount' });
      directory_listing.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }
  directory_listing.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    business_account_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    state_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    city_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    category_id: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_suspended: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'directory_listing',
    tableName: 'directory_listings',
    underscored: true,
    timestamps: true,
    paranoid: false,
    freezeTableName: true
  });
  return directory_listing;
};

