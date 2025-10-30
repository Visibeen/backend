'use strict';

require('dotenv').config();
const db = require('../models');

(async () => {
  try {
    await db.city.destroy({ where: {}, truncate: true, force: true });
    console.log('[ClearCities] cities table truncated.');
  } catch (err) {
    console.error('[ClearCities] Failed:', err);
    process.exit(1);
  }
  process.exit(0);
})();


