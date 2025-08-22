'use strict';

const bcrypt = require('bcrypt');
module.exports = {
  async up (queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('admin@123', 10);
    await queryInterface.bulkInsert('users', [{
      full_name: 'Admin',
      email: 'admin@example.com',
      phone_number:"+91",
      password: hashedPassword,
      role_id: '1',
      created_at: new Date(),
      updated_at: new Date()
    }], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { email: 'admin@example.com' }, {});
  }
};
