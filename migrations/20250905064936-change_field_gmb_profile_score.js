'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      'gmb_profile_socres',
      'QAndA_section_present',
      'q_and_a_section_present'
    );

    await queryInterface.changeColumn('gmb_profile_socres', 'q_and_a_section_present', {
      type: Sequelize.STRING,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      'gmb_profile_socres',
      'q_and_a_section_present',
      'QAndA_section_present'
    ); 
  }
};
