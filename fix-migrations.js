/**
 * Fix Migration Status Script
 * Marks old migrations as completed so only new ones run
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

const config = require('./config/config.js');
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

async function fixMigrations() {
  console.log('🔧 Fixing migration status...\n');

  const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      dialect: dbConfig.dialect,
      logging: false
    }
  );

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // List of migrations to mark as completed
    const migrationsToMark = [
      '20250804070739-add_field_user.js',
      '20250804110850-add_field_user_restPassword_token.js',
      '20250805123329-create-business-account.js',
      '20250806063206-create-contact-us.js',
      '20250808061734-change_datetype_user_table.js',
      '20250813094805-create-edms.js',
      '20250814070826-create-post.js',
      '20250814071916-add_image_post.js',
      '20250814072610-create-account.js',
      '20250814085605-create-gst-information.js',
      '20250814091501-create-cro-information.js',
      '20250814095256-add_edms.js',
      '20250819093929-create-holiday.js',
      '20250827051745-add_field_account.js',
      '20250827070557-add_field_gstInformation.js',
      '20250901100759-add_field_countactus.js',
      '20250901102303-change-date_and_time-to-datetime.js',
      '20250901103914-add_field_gst_information.js',
      '20250905054650-create-gmb-profile-socre.js',
      '20250905064936-change_field_gmb_profile_score.js',
      '20251015055625-add-missing-columns-to-user-activities.js',
      '20251016000000-create-task.js',
      '20251016000001-create-gmb-account.js'
    ];

    console.log(`📋 Marking ${migrationsToMark.length} migrations as completed...\n`);

    for (const migration of migrationsToMark) {
      try {
        await sequelize.query(
          'INSERT IGNORE INTO SequelizeMeta (name) VALUES (?)',
          { replacements: [migration] }
        );
        console.log(`✅ ${migration}`);
      } catch (error) {
        console.log(`⚠️  ${migration} - ${error.message}`);
      }
    }

    console.log('\n✅ Migration status fixed successfully!');
    console.log('\n📝 Now run: npx sequelize-cli db:migrate\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

fixMigrations();
