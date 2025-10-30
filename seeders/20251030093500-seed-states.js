'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();
    const states = [
      { name: 'Andhra Pradesh', slug: 'andhra-pradesh' },
      { name: 'Arunachal Pradesh', slug: 'arunachal-pradesh' },
      { name: 'Assam', slug: 'assam' },
      { name: 'Bihar', slug: 'bihar' },
      { name: 'Chhattisgarh', slug: 'chhattisgarh' },
      { name: 'Goa', slug: 'goa' },
      { name: 'Gujarat', slug: 'gujarat' },
      { name: 'Haryana', slug: 'haryana' },
      { name: 'Himachal Pradesh', slug: 'himachal-pradesh' },
      { name: 'Jharkhand', slug: 'jharkhand' },
      { name: 'Karnataka', slug: 'karnataka' },
      { name: 'Kerala', slug: 'kerala' },
      { name: 'Madhya Pradesh', slug: 'madhya-pradesh' },
      { name: 'Maharashtra', slug: 'maharashtra' },
      { name: 'Manipur', slug: 'manipur' },
      { name: 'Meghalaya', slug: 'meghalaya' },
      { name: 'Mizoram', slug: 'mizoram' },
      { name: 'Nagaland', slug: 'nagaland' },
      { name: 'Odisha', slug: 'odisha' },
      { name: 'Punjab', slug: 'punjab' },
      { name: 'Rajasthan', slug: 'rajasthan' },
      { name: 'Sikkim', slug: 'sikkim' },
      { name: 'Tamil Nadu', slug: 'tamil-nadu' },
      { name: 'Telangana', slug: 'telangana' },
      { name: 'Tripura', slug: 'tripura' },
      { name: 'Uttar Pradesh', slug: 'uttar-pradesh' },
      { name: 'Uttarakhand', slug: 'uttarakhand' },
      { name: 'West Bengal', slug: 'west-bengal' },
      { name: 'Andaman and Nicobar Islands', slug: 'andaman-and-nicobar-islands' },
      { name: 'Chandigarh', slug: 'chandigarh' },
      { name: 'Dadra and Nagar Haveli and Daman and Diu', slug: 'dadra-and-nagar-haveli-and-daman-and-diu' },
      { name: 'Delhi', slug: 'delhi' },
      { name: 'Jammu and Kashmir', slug: 'jammu-and-kashmir' },
      { name: 'Ladakh', slug: 'ladakh' },
      { name: 'Lakshadweep', slug: 'lakshadweep' },
      { name: 'Puducherry', slug: 'puducherry' },
    ].map(s => ({ ...s, created_at: now, updated_at: now }));

    await queryInterface.bulkInsert('states', states, {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('states', null, {});
  }
};

