module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('edms', 'deletedAt', {
      type: Sequelize.DATE,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('edms', 'deletedAt');
  }
};
