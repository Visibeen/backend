'use strict';

const models = require('../models');

function slugify(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

// Common alias mappings for Indian cities and states (slug → canonical slug)
const STATE_ALIASES = new Map([
  ['nct-of-delhi', 'delhi'],
  ['delhi-nct', 'delhi'],
  ['pondicherry', 'puducherry'],
  ['orissa', 'odisha'],
]);

const CITY_ALIASES = new Map([
  ['sahibzada-ajit-singh-nagar', 'mohali'],
  ['bangalore', 'bengaluru'],
  ['bombay', 'mumbai'],
  ['calcutta', 'kolkata'],
  ['baroda', 'vadodara'],
  ['gurgaon', 'gurugram'],
  ['trivandrum', 'thiruvananthapuram'],
  ['pondicherry', 'puducherry'],
  ['vizag', 'visakhapatnam'],
]);

async function resolveStateCityIds(stateName, cityName) {
  if (!stateName || !cityName) return { state: null, city: null };
  let stateSlug = slugify(stateName);
  // Alias for state
  if (STATE_ALIASES.has(stateSlug)) stateSlug = STATE_ALIASES.get(stateSlug);
  const state = await models.state.findOne({ where: { slug: stateSlug } });
  if (!state) return { state: null, city: null };
  let citySlug = slugify(cityName);
  // Try direct match
  let city = await models.city.findOne({ where: { slug: citySlug, state_id: state.id } });
  // Alias for city within the resolved state
  if (!city) {
    if (CITY_ALIASES.has(citySlug)) {
      const aliasSlug = CITY_ALIASES.get(citySlug);
      city = await models.city.findOne({ where: { slug: aliasSlug, state_id: state.id } });
    }
  }
  return { state, city };
}

async function resolveOrCreateCategoryId(categoryName) {
  let effectiveName = String(categoryName || '').trim();
  if (!effectiveName) effectiveName = 'Other';
  const slug = slugify(effectiveName);
  let cat = await models.category.findOne({ where: { slug } });
  if (!cat) {
    cat = await models.category.create({ name: effectiveName, slug, gmb_code: null });
  }
  return cat.id;
}

function buildAddress(biz) {
  const parts = [biz.street_address, biz.city, biz.state, biz.pin_code];
  return parts.filter(Boolean).join(', ');
}

async function upsertListingForBusinessAccount(biz) {
  const { state, city } = await resolveStateCityIds(biz.state, biz.city);
  if (!state || !city) return { skipped: true, reason: 'missing_state_city' };
  const categoryId = await resolveOrCreateCategoryId(biz.business_category);

  const payload = {
    business_account_id: biz.id,
    user_id: biz.user_id || null,
    state_id: state.id,
    city_id: city.id,
    category_id: categoryId || null,
    title: biz.business_name || 'Business',
    address: buildAddress(biz),
    phone: biz.contact_number || null,
    website: biz.website || null,
    slug: slugify(`${biz.business_name || 'business'}-${city.slug}`),
    published_at: new Date(),
    is_suspended: false,
  };

  const existing = await models.directory_listing.findOne({ where: { business_account_id: biz.id } });
  if (existing) {
    await existing.update(payload);
    return { updated: true, id: existing.id };
  }
  const created = await models.directory_listing.create(payload);
  return { created: true, id: created.id };
}

module.exports = {
  upsertListingForBusinessAccount,
  upsertListingFromPayload: async (payload, userId = null) => {
    const stateName = payload.state || payload.state_name;
    const cityName = payload.city || payload.city_name;
    const categoryName = payload.business_category || payload.category || payload.category_name;
    const { state, city } = await resolveStateCityIds(stateName, cityName);
    if (!state || !city) return { skipped: true, reason: 'missing_state_city' };
    const categoryId = await resolveOrCreateCategoryId(categoryName);

    const title = payload.business_name || payload.title || 'Business';
    const data = {
      business_account_id: payload.business_account_id || null,
      user_id: userId || payload.user_id || null,
      state_id: state.id,
      city_id: city.id,
      category_id: categoryId || null,
      title,
      address: payload.street_address || payload.address || buildAddress(payload),
      phone: payload.contact_number || payload.phone || null,
      website: payload.website || null,
      slug: slugify(`${title}-${city.slug}`),
      published_at: new Date(),
      is_suspended: false,
    };

    const existing = await models.directory_listing.findOne({ where: { slug: data.slug } });
    if (existing) {
      await existing.update(data);
      return { updated: true, id: existing.id };
    }
    const created = await models.directory_listing.create(data);
    return { created: true, id: created.id };
  }
};


