'use strict';

/**
 * GMB Account Model
 * @description Sequelize model for gmb_accounts table
 * @author Senior Backend Developer
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GmbAccount extends Model {
    static associate(models) {
      // Association with User
      GmbAccount.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }

    /**
     * Get formatted address
     */
    getFormattedAddress() {
      if (this.location_data?.storefrontAddress) {
        const addr = this.location_data.storefrontAddress;
        return [
          addr.addressLines?.join(', '),
          addr.locality,
          addr.administrativeArea,
          addr.postalCode
        ].filter(Boolean).join(', ');
      }
      return this.address || '';
    }

    /**
     * Check if account needs sync (older than 24 hours)
     */
    needsSync() {
      if (!this.last_synced_at) return true;
      const hoursSinceSync = (new Date() - new Date(this.last_synced_at)) / (1000 * 60 * 60);
      return hoursSinceSync > 24;
    }
  }

  GmbAccount.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'User ID is required'
        }
      }
    },
    account_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    location_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    business_name: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    location_name: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    location_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_synced_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'GmbAccount',
    tableName: 'gmb_accounts',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return GmbAccount;
};
