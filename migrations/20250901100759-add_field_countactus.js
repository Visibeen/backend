module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('contact_us', 'complaint_type', {
      type: Sequelize.STRING,
      after: "email"
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('contact_us', 'complaint_type');  
  },

};
