const express = require('express');
const router = express.Router();
const db = require('../../models');
const middleware = require('../../utils/middleware');
const directory = require('../../utils/directory');
const { Op, fn, col, literal } = db.Sequelize;

// GET /api/v1/directory/states
router.get('/states', async (req, res) => {
  try {
    const states = await db.state.findAll({ order: [['name', 'ASC']] });
    res.json(states);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch states', error: String(err) });
  }
});

// GET /api/v1/directory/states/:stateSlug/cities
router.get('/states/:stateSlug/cities', async (req, res) => {
  try {
    const state = await db.state.findOne({ where: { slug: req.params.stateSlug } });
    if (!state) return res.status(404).json({ message: 'State not found' });
    const cities = await db.city.findAll({ where: { state_id: state.id }, order: [['name', 'ASC']] });
    res.json(cities);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch cities', error: String(err) });
  }
});

// GET /api/v1/directory/in/:stateSlug/:citySlug/categories
router.get('/in/:stateSlug/:citySlug/categories', async (req, res) => {
  try {
    const state = await db.state.findOne({ where: { slug: req.params.stateSlug } });
    if (!state) return res.status(404).json({ message: 'State not found' });
    const city = await db.city.findOne({ where: { slug: req.params.citySlug, state_id: state.id } });
    if (!city) return res.status(404).json({ message: 'City not found' });

    // Count listings per category in this city
    const counts = await db.directory_listing.findAll({
      attributes: ['category_id', [fn('COUNT', col('id')), 'count']],
      where: { city_id: city.id, is_suspended: false },
      group: ['category_id']
    });
    const countMap = {};
    counts.forEach(c => { countMap[String(c.category_id)] = Number(c.get('count')); });

    const categories = await db.category.findAll({ order: [['name', 'ASC']] });
    const result = categories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      gmb_code: c.gmb_code,
      count: countMap[String(c.id)] || 0
    }));
    res.json({ state: { id: state.id, name: state.name, slug: state.slug }, city: { id: city.id, name: city.name, slug: city.slug }, categories: result });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch categories', error: String(err) });
  }
});

// GET /api/v1/directory/in/:stateSlug/:citySlug/:categorySlug/listings
router.get('/in/:stateSlug/:citySlug/:categorySlug/listings', async (req, res) => {
  try {
    const { stateSlug, citySlug, categorySlug } = req.params;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || '20', 10)));

    const state = await db.state.findOne({ where: { slug: stateSlug } });
    if (!state) return res.status(404).json({ message: 'State not found' });
    const city = await db.city.findOne({ where: { slug: citySlug, state_id: state.id } });
    if (!city) return res.status(404).json({ message: 'City not found' });
    const category = await db.category.findOne({ where: { slug: categorySlug } });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const where = { state_id: state.id, city_id: city.id, category_id: category.id, is_suspended: false };
    const offset = (page - 1) * pageSize;

    const { rows, count } = await db.directory_listing.findAndCountAll({
      where,
      order: [['title', 'ASC']],
      offset,
      limit: pageSize,
      include: [
        { model: db.state, as: 'state', attributes: ['id', 'name', 'slug'] },
        { model: db.city, as: 'city', attributes: ['id', 'name', 'slug'] },
        { model: db.category, as: 'category', attributes: ['id', 'name', 'slug'] },
      ]
    });

    res.json({
      state: { id: state.id, name: state.name, slug: state.slug },
      city: { id: city.id, name: city.name, slug: city.slug },
      category: { id: category.id, name: category.name, slug: category.slug },
      page,
      pageSize,
      total: count,
      listings: rows
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch listings', error: String(err) });
  }
});

module.exports = router;

// Authenticated deploy endpoint
router.post('/deploy', middleware.verifyAuthenticate, async (req, res) => {
  try {
    const cUser = req.body.current_user;
    const result = await directory.upsertListingFromPayload(req.body || {}, cUser?.id);
    if (result && result.skipped) {
      return res.status(422).json({ success: false, message: 'Could not map state/city/category. Please verify address and category.', result });
    }
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to deploy listing', error: String(err) });
  }
});


