'use strict';

const bcrypt = require('bcrypt');
module.exports = {
  async up (queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('max@123', 10);
    await queryInterface.bulkInsert('users', [{
      full_name: 'max',
      email: 'max@max.com',
      phone_number:"+91987443210",
      password: hashedPassword,
      role_id: 1,
      created_at: new Date(),
      updated_at: new Date()
    }], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { email: 'max@max.com' }, {});
  }
};
