/**
 * Profile Permission Model
 * @description Stores which GMB profiles a user has access to
 */

module.exports = (sequelize, DataTypes) => {
  const ProfilePermission = sequelize.define(
    'profile_permission',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'User email who has permission'
      },
      profile_id: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'GMB location ID / profile ID'
      },
      added_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Admin user ID who granted this permission'
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'profile_permissions',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: false,
          fields: ['email']
        },
        {
          unique: false,
          fields: ['profile_id']
        },
        {
          unique: true,
          fields: ['email', 'profile_id'],
          name: 'unique_email_profile'
        }
      ]
    }
  );

  ProfilePermission.associate = function (models) {
    // Association with User who added the permission
    ProfilePermission.belongsTo(models.User, {
      foreignKey: 'added_by',
      as: 'addedByAdmin'
    });
  };

  return ProfilePermission;
};
