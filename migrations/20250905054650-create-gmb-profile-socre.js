'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('gmb_profile_socres', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.BIGINT
      },
      account: {
        type: Sequelize.STRING
      },
      location: {
        type: Sequelize.STRING
      },
      verification: {
        type: Sequelize.STRING
      },
      business_name_contains_city: {
        type: Sequelize.STRING
      },
      address: {
        type: Sequelize.STRING
      },
      phone_number: {
        type: Sequelize.STRING
      },
      description_length: {
        type: Sequelize.STRING
      },
      website_link: {
        type: Sequelize.STRING
      },
      timings: {
        type: Sequelize.STRING
      },
      labels: {
        type: Sequelize.STRING
      },
      categories_primary: {
        type: Sequelize.STRING
      },
      categories_additional: {
        type: Sequelize.STRING
      },
      category_mentions_city: {
        type: Sequelize.STRING
      },
      social_media_attached: {
        type: Sequelize.STRING
      },
      appointments_link: {
        type: Sequelize.STRING
      },
      service_area: {
        type: Sequelize.STRING
      },
      book_appointment: {
        type: Sequelize.STRING
      },
      QAndA_section_present: {
        type: Sequelize.STRING
      },
      photos: {
        type: Sequelize.STRING
      },
      review_rating: {
        type: Sequelize.STRING
      },
      response_rate: {
        type: Sequelize.STRING
      },
      reviews_vs_competitors: {
        type: Sequelize.STRING
      },
      velocity_score: {
        type: Sequelize.STRING
      },
      gmb_feed: {
        type: Sequelize.STRING
      },
      total_score: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.BOOLEAN
      },
      deletedAt: {
        type: Sequelize.DATE
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('gmb_profile_socres');
  }
};