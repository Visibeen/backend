'use strict';

require('dotenv').config();
const db = require('../models');

function slugify(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

const rawNames = [
  'Restaurant','Cafe','Hotel','Dentist','Doctor','Salon','Spa','Gym','Pharmacy','Hospital','Supermarket','Real Estate Agency','Car Dealership','Boutique','School','University','Bar','Bakery','Clothing Store','Electronics Store','Furniture Store','Pet Store','Veterinarian','Lawyer','Plumber','Electrician','Cleaning Service','Accountant','Marketing Agency','Photography Studio','Tattoo Studio','Auto Repair','Mechanic','Travel Agency','Courier Service','Hardware Store','Jewelry Store','Mobile Store','Dry Cleaner','Courier Company','Ice Cream Shop','Fast Food Restaurant','Interior Designer','Architect','Consultant','Yoga Studio','Driving School','Florist','Grocery Store','Event Planner'
];

(async () => {
  try {
    // Replace everything with the provided set
    await db.category.destroy({ where: {}, truncate: true, force: true });

    const seen = new Set();
    let inserted = 0;
    for (const name of rawNames) {
      const trimmed = String(name || '').trim();
      if (!trimmed) continue;
      const slug = slugify(trimmed);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      await db.category.create({ name: trimmed, slug, gmb_code: null });
      inserted++;
    }
    console.log(`[SeedCategories] Inserted ${inserted} categories.`);
  } catch (err) {
    console.error('[SeedCategories] Failed:', err);
    process.exit(1);
  }
  process.exit(0);
})();


