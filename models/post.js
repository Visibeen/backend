'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class post extends Model {
    static associate(models) {
    }
  }
  post.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id:{
      type: DataTypes.BIGINT,
    },
    name:{
      type: DataTypes.STRING,
    },
    testimonial_text:{
      type: DataTypes.TEXT,
    },
    status:{
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    image: {
      type: DataTypes.TEXT,
    }
  }, {
    sequelize,
    modelName: 'post',
    tableName: 'posts',
    underscored: true,
    timestamps: true,
    paranoid:false,
    freezeTableName:true
  });
  return post;
};