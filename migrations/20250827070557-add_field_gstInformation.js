module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('gst_informations', 'start_date', {
      type: Sequelize.STRING,
      after: "gst_details"
    });
    await queryInterface.addColumn('gst_informations', 'end_date', {
      type: Sequelize.STRING,
      after: "start_date"
    });
   
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('gst_informations', 'start_date');
    await queryInterface.removeColumn('gst_informations', 'end_date');
  
  },

};
