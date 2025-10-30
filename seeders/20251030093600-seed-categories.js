'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    const categories = [
      { name: 'Digital Marketing', slug: 'digital-marketing', gmb_code: 'gcid:digital_marketing' },
      { name: 'Plumber', slug: 'plumber', gmb_code: 'gcid:plumber' },
      { name: 'Restaurant', slug: 'restaurant', gmb_code: 'gcid:restaurant' },
      { name: 'Doctor', slug: 'doctor', gmb_code: 'gcid:doctor' },
      { name: 'Salon', slug: 'salon', gmb_code: 'gcid:beauty_salon' }
    ].map(c => ({ ...c, created_at: now, updated_at: now }));

    await queryInterface.bulkInsert('categories', categories, {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('categories', null, {});
  }
};

