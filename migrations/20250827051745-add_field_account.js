module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('accounts', 'cro_employee_name', {
      type: Sequelize.STRING,
      after: "end_date"
    });
    await queryInterface.addColumn('accounts', 'seo_employee_name', {
      type: Sequelize.STRING,
      after: "cro_employee_name"
    });
    await queryInterface.addColumn('accounts', 'password', {
      type: Sequelize.STRING,
      after: "seo_employee_name"
    });
    await queryInterface.addColumn('accounts', 'contact_person', {
      type: Sequelize.STRING,
      after: "password"
    });
    await queryInterface.addColumn('accounts', 'contact_number', {
      type: Sequelize.STRING,
      after: "contact_person"
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('accounts', 'cro_employee_name');
    await queryInterface.removeColumn('accounts', 'seo_employee_name');
    await queryInterface.removeColumn('accounts', 'password');
    await queryInterface.removeColumn('accounts', 'contact_person');
    await queryInterface.removeColumn('accounts', 'contact_number');



  },

};
