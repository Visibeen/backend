'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('tasks', 'post_content', {
      type: Sequelize.TEXT('long'), // LONGTEXT
      allowNull: true,
      comment: 'JSON string containing GMB post data (summary, topicType, media with base64 images, etc.)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('tasks', 'post_content', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON string containing GMB post data (summary, topicType, media, etc.)'
    });
  }
};

