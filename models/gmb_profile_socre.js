'use strict';
const {
  Model
} = require('sequelize');
const User = require('./user');
module.exports = (sequelize, DataTypes) => {
  class gmb_profile_socre extends Model {
    static associate(models) {
    }
  }
  gmb_profile_socre.init({
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
    account: {
      type: DataTypes.STRING,
    },
    location: {
      type: DataTypes.STRING,
    },
    verification: {
      type: DataTypes.STRING,
    },
    business_name_contains_city: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.STRING,
    },
    phone_number: {
      type: DataTypes.STRING,
    },
    description_length: {
      type: DataTypes.STRING,
    },
    website_link: {
      type: DataTypes.STRING,
    },
    timings: {
      type: DataTypes.STRING,
    },
    labels: {
      type: DataTypes.STRING,
    },
    categories_primary: {
      type: DataTypes.STRING,
    },
    categories_additional: {
      type: DataTypes.STRING,
    },
    category_mentions_city: {
      type: DataTypes.STRING,
    },
    social_media_attached: {
      type: DataTypes.STRING,
    },
    appointments_link: {
      type: DataTypes.STRING,
    },
    service_area: {
      type: DataTypes.STRING,
    },
    book_appointment: {
      type: DataTypes.STRING,
    },
    q_and_a_section_present: {
      type: DataTypes.STRING,
    },
    photos: {
      type: DataTypes.STRING,
    },
    review_rating: {
      type: DataTypes.STRING,
    },
    response_rate: {
      type: DataTypes.STRING,
    },
    reviews_vs_competitors: {
      type: DataTypes.STRING,
    },
    velocity_score: {
      type: DataTypes.STRING,
    },
    gmb_feed: {
      type: DataTypes.STRING,
    },
    total_score: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
  }, {
    sequelize,
    modelName: 'gmb_profile_socre',
    tableName: 'gmb_profile_socres',
    underscored: true,
    timestamps: true,
    paranoid: false,
    freezeTableName: true
  });
  return gmb_profile_socre;
};