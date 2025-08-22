const { make } = require('simple-body-validator');
const { Op } = require("sequelize");
const config = require('../../../config');
const constants = require("../../../constants/index");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const moment = require("moment")
const router = express.Router();
const support = require('../../../utils/support');
var REST = require("../../../utils/REST");
const { compare } = require('../../../utils/hash');
const auth = require('../../../utils/auth');
const axios = require('axios');


router.get('/getBusinessProfile', async function (req, res) {	
	try {
		const { googleAccessToken } = req.query;
		if (!googleAccessToken) {
			return REST.error(res, 'Google access token is required.', 400);
		}
		const response = await axios.get('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
			headers: {
				'Authorization': `Bearer ${googleAccessToken}`,
				'Content-Type': 'application/json',
			},
		});		
		if (response.data?.accounts && response.data?.accounts?.length > 0) {
			return REST.success(res, response.data.accounts, 'GMB profiles found.');
		} else {
			return REST.error(res, 'No GMB profiles found.', 404);
		}
	} catch (error) {
		return REST.error(res, error.message, 500);
	}
});
router.get('/getGmbProfile/:accountId', async function (req, res) {
	try {
		const { googleAccessToken } = req.query;
		const { accountId } = req.params;
		if (!googleAccessToken || typeof googleAccessToken !== 'string' || !googleAccessToken.trim()) {
			return REST.error(res, 'Google access token is required.', 400);
		}
		if (!accountId) {
			return REST.error(res, 'Account ID is required.', 400);
		}

		const token = googleAccessToken.trim();
		console.log('Using access token:', JSON.stringify(token));
		const fields = [
			'storeCode', 'regularHours', 'name', 'languageCode', 'title',
			'phoneNumbers', 'categories', 'storefrontAddress', 'websiteUri',
			'specialHours', 'serviceArea', 'labels', 'adWordsLocationExtensions',
			'latlng', 'openInfo', 'metadata', 'profile', 'relationshipData', 'moreHours'
		].join(',');
		const url = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${encodeURIComponent(accountId)}/locations`;
		const response = await axios.get(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			params: {
				readMask: fields,
				pageSize: 100,
			},
		});
		const locations = response.data?.locations;
		if (Array.isArray(locations) && locations.length > 0) {
			return REST.success(res, locations, 'GMB locations found.');
		} else {
			return REST.error(res, 'No GMB locations found.', 404);
		}
	} catch (error) {
		return REST.error(res, error.message, error.response?.status || 500);
	}
});
router.get('/getGmbratings/:locationId', async function (req, res) {
	try {
		const { googleAccessToken } = req.query;
		const { locationId } = req.params;
		if (!googleAccessToken || typeof googleAccessToken !== 'string' || !googleAccessToken.trim()) {
			return REST.error(res, 'Google access token is required.', 400);
		}
		if (!locationId) {
			return REST.error(res, 'Location ID is required.', 400);
		}

		const token = googleAccessToken.trim();
		console.log('Using access token:', JSON.stringify(token));
		const url = `https://mybusiness.googleapis.com/v4/${encodeURIComponent(locationId)}/reviews`;
		const response = await axios.get(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			params: {
				pageSize: 100,
			},
		});
		const reviews = response.data?.reviews;
		if (Array.isArray(reviews) && reviews.length > 0) {
			return REST.success(res, reviews, 'GMB reviews found.');
		} else {
			return REST.error(res, 'No GMB reviews found.', 404);
		}
	} catch (error) {
		return REST.error(res, error.message, error.response?.status || 500);
	}
});
router.get('/getGmbMedia/:locationId', async function (req, res) {
	try {
		const { googleAccessToken } = req.query;
		const { locationId } = req.params;
		if (!googleAccessToken || typeof googleAccessToken !== 'string' || !googleAccessToken.trim()) {
			return REST.error(res, 'Google access token is required.', 400);
		}
		if (!locationId) {
			return REST.error(res, 'Location ID is required.', 400);
		}
		const token = googleAccessToken.trim();
		console.log('Using access token:', JSON.stringify(token));
		const url = `https://mybusiness.googleapis.com/v4/${encodeURIComponent(locationId)}/media`;
		const response = await axios.get(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			params: {
				pageSize: 100,
			},
		});
		const mediaItems = response.data?.mediaItems;
		if (Array.isArray(mediaItems) && mediaItems.length > 0) {

			return REST.success(res, mediaItems, 'GMB media items found.');
		}
		else {
			return REST.error(res, 'No GMB media items found.', 404);
		}
	} catch (error) {
		return REST.error(res, error.message, error.response?.status || 500);
	}
});
router.get('/getLastFeed/:locationId', async function (req, res) {
	try {
		const { googleAccessToken } = req.query;
		const { locationId } = req.params;
		if (!googleAccessToken || typeof googleAccessToken !== 'string' || !googleAccessToken.trim()) {
			return REST.error(res, 'Google access token is required.', 400);
		}
		if (!locationId) {
			return REST.error(res, 'Location ID is required.', 400);
		}
		const token = googleAccessToken.trim();
		console.log('Using access token:', JSON.stringify(token));
		const url = `https://mybusiness.googleapis.com/v4/${encodeURIComponent(locationId)}/localPosts`;
		const response = await axios.get(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			params: {
				pageSize: 100,
			},
		});
		const posts = response.data?.localPosts;
		if (Array.isArray(posts) && posts.length > 0) {
			return REST.success(res, posts, 'GMB posts found.');
		} else {
			return REST.error(res, 'No GMB posts found.', 404);
		}
	} catch (error) {
		return REST.error(res, error.message, error.response?.status || 500);
	}
});	
router.get('/getGmbInsights/:locationId', async function (req, res) {
	try {
		const { googleAccessToken } = req.query;
		const { locationId } = req.params;
		if (!googleAccessToken || typeof googleAccessToken !== 'string' || !googleAccessToken.trim()) {
			return REST.error(res, 'Google access token is required.', 400);
		}
		if (!locationId) {
			return REST.error(res, 'Location ID is required.', 400);
		}
		const token = googleAccessToken.trim();
		console.log('Using access token:', JSON.stringify(token));
		const url = `https://mybusiness.googleapis.com/v4/${encodeURIComponent(locationId)}/insights`;
		const response = await axios.get(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			params: {
				pageSize: 100,
			},
		});
		const insights = response.data?.insights;
		if (Array.isArray(insights) && insights.length > 0) {
			return REST.success(res, insights, 'GMB insights found.');
		} else {
			return REST.error(res, 'No GMB insights found.', 404);
		}
	} catch (error) {
		return REST.error(res, error.message, error.response?.status || 500);
	}
});
router.post('/search-gmb-profile', async function (req, res) {
  try {
    const { googleAccessToken, query } = req.body;

    if (!googleAccessToken || typeof googleAccessToken !== 'string' || !googleAccessToken.trim()) {
      return REST.error(res, 'Google access token is required.', 400);
    }
    if (!query || typeof query !== 'string' || !query.trim()) {
      return REST.error(res, 'Search query is required.', 400);
    }
    const token = googleAccessToken.trim();
    const textQuery = query.trim();

    const fieldMask = [
      'places.displayName',
      'places.formattedAddress',
      'places.websiteUri',
      'places.types',
      'places.phoneNumbers',
      'places.latlng'
    ].join(',');

    const response = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      {
        textQuery: textQuery,
        pageSize: 20
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': fieldMask,
          'Authorization': `Bearer ${token}`
        }
      }
    );
    const places = response.data?.places;
    if (Array.isArray(places) && places.length > 0) {
      return REST.success(res, places, 'Places found.');
    } else {
      return REST.error(res, 'No places found.', 404);
    }
  } catch (error) {
    console.error('Places search error:', error.response?.data || error.message);
    return REST.error(res, error.message, error.response?.status || 500);
  }
});

module.exports = router;
