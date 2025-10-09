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
const puppeteer = require('puppeteer');
const { generateGrid } = require('../../../utils/helper');
const { postTasks } = require('../../../utils/helper');
const pLimit = require('p-limit');
const { v4: uuidv4 } = require('uuid');
/*
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
|                                                    Google My Business (GMB) Integration Routes
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

router.get('/getGmbAccount', async function (req, res) {
	try {
		const { googleAccessToken } = req.query;
		if (!googleAccessToken) {
			return REST.error(res, 'Google access token is required.', 400);
		}
		const token = googleAccessToken.trim();
		const response = await axios.get('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});
		if (response.data?.accounts && response.data?.accounts?.length > 0) {
			return REST.success(res, response.data.accounts, 'GMB account fetched successfully.');
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
		if (!googleAccessToken) {
			return REST.error(res, 'Google access token is required.', 400);
		}
		if (!locationId) {
			return REST.error(res, 'Location ID is required.', 400);
		}

		const token = googleAccessToken.trim();
		const url = `https://mybusiness.googleapis.com/v4/${encodeURIComponent(locationId)}/reviews`;
		const response = await axios.get(url, {
			headers: {
				'Authorization': `${token?.token}`,
				'Content-Type': 'application/json',
			},
			params: {
				pageSize: 100,
			},
		});
		const reviews = response?.data?.reviews;
		if (reviews.length > 0) {
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
router.get('/getLastFeed/:accountId/:locationId', async function (req, res) {
	try {
		const { googleAccessToken } = req.query;
		const { locationId, accountId } = req.params;
		if (!googleAccessToken || typeof googleAccessToken !== 'string' || !googleAccessToken.trim()) {
			return REST.error(res, 'Google access token is required.', 400);
		}
		if (!locationId) {
			return REST.error(res, 'Location ID is required.', 400);
		}
		if (!accountId) {
			return REST.error(res, 'Account ID is required.', 400);
		}

		const token = googleAccessToken.trim();
		const url = `https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/localPosts`;
		const response = await axios.get(url, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			params: {
				pageSize: 10,
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
});;
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
router.get('/get-gmb-verifyAccount/:locationId', async function (req, res) {
	try {
		const { googleAccessToken } = req.query;
		const { locationId } = req.params;
		if (!googleAccessToken) {
			return REST.error(res, 'Google access token is required.', 400);
		}
		if (!locationId) {
			return REST.error(res, 'Location ID is required.', 400);
		}
		const token = googleAccessToken.trim();
		const url = `https://mybusinessverifications.googleapis.com/v1/locations/${locationId}/VoiceOfMerchantState`;
		const response = await axios.get(url, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});

		if (response?.data?.VoiceOfMerchantState) {
			return REST.success(res, response.data.VoiceOfMerchantState, 'GMB Verification Account Fetched Successfully.');
		} else {
			return REST.error(res, 'No GMB profiles found.', 404);
		}
	} catch (error) {
		console.error('Error details:', error.response?.data || error.message);
		return REST.error(res, error.response?.data?.error?.message || error.message, error.response?.status || 500);
	}
});
router.patch('/gmb-notifications/:accountId', async function (req, res) {
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
		const pubsubBody = {
			pubsubTopic: "projects/myapi-430807/topics/gmb_notification"
		};

		const url = `https://mybusinessnotifications.googleapis.com/v1/accounts/${encodeURIComponent(accountId)}/notificationSetting?updateMask=pubsub_topic`;
		const response = await axios.patch(url, pubsubBody, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
			}
		});
		return REST.success(res, response.data, 'Pub/Sub topic configured successfully.');
	} catch (error) {
		console.error('Pub/Sub setup error:', error?.response?.data || error.message);
		return REST.error(res, error.message, error.response?.status || 500);
	}
});
router.get('/get-gmb-products/:locationId', async function (req, res) {
	try {
		const { googleAccessToken } = req.query;
		const { locationId } = req.params;
		if (!googleAccessToken) {
			return REST.error(res, 'Google access token is required.', 400);
		}
		if (!locationId) {
			return REST.error(res, 'Location ID is required.', 400);
		}
		const token = googleAccessToken.trim();
		const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${encodeURIComponent(locationId)}/products`;
		const response = await axios.get(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			params: {
				pageSize: 100,
			},
		});
		const products = response.data?.products;
		if (Array.isArray(products) && products.length > 0) {
			return REST.success(res, products, 'GMB products found.');
		} else {
			return REST.error(res, 'No GMB products found.', 404);
		}
	} catch (error) {
		return REST.error(res, error.message, error.response?.status || 500);

	}
})
class BusinessCategoryScraper {
	constructor() {
		this.browser = null;
	}
	async initBrowser() {
		if (!this.browser) {
			this.browser = await puppeteer.launch({
				headless: true,
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--disable-gpu',
					'--disable-web-security',
					'--disable-blink-features=AutomationControlled',
				],
			});
		}
		return this.browser;
	}

	async extractCategory(businessName) {
		try {
			const browser = await this.initBrowser();
			const page = await browser.newPage();
			await page.setUserAgent(
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
			);
			await page.setViewport({ width: 1366, height: 768 });
			await page.evaluateOnNewDocument(() => {
				Object.defineProperty(navigator, 'webdriver', {
					get: () => undefined,
				});
			});
			const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(businessName)}`;
			await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
			await new Promise(resolve => setTimeout(resolve, 4000));
			const result = await page.evaluate(() => {
				const panel = document.querySelector('#rhs, .kp-blk, .knowledge-panel');
				if (!panel) return { businessName: '', categories: [] };
				const name = document.querySelector('h1, .kp-header h1, .kno-ecr-pt')?.innerText?.trim() || '';
				const elements = panel.querySelectorAll(
					'[data-attrid="subtitle"], [data-attrid="kc:/local:merged-vertical-subtitle"]'
				);
				for (const el of elements) {
					const text = el.innerText?.trim();
					const cleaned = text.replace(/^\d+(\.\d+)?★?[\d,]*\s*Google reviews\s*/i, '').trim();
					if (cleaned && / in /.test(cleaned)) {
						return {
							businessName: name,
							categories: [cleaned],
						};
					}
				}
				return { businessName: name, categories: [] };
			});
			await page.close();
			return result;
		} catch (err) {
			throw err;
		}
	}
}
const scraper = new BusinessCategoryScraper();
router.get('/get-business-category', async (req, res) => {
	try {
		const { businessName } = req.query;
		if (!businessName || typeof businessName !== 'string') {
			return REST.error(res, '"businessName" is required.', 400);
		}
		const result = await scraper.extractCategory(businessName.trim());
		if (result.categories.length > 0 && result.businessName) {
			return REST.success(res, result, 'Business category found.');
		} else {
			return REST.error(res, 'No business category found.', 404);
		}
	} catch (error) {
		return REST.error(res, error.message, 500);
	}
})
router.get('/textsearch', async function (req, res) {
	try {
		const { query, lat, lng, radius } = req.query;
		if (!query) return res.status(400).json({ error: 'Missing query' });

		const centerLat = lat ? Number(lat) : undefined;
		const centerLng = lng ? Number(lng) : undefined;
		const radiusMeters = radius ? Number(radius) : 5000;
		const body = {
			textQuery: query,
			locationBias: (centerLat && centerLng) ? {
				circle: {
					center: { latitude: centerLat, longitude: centerLng },
					radius: radiusMeters
				}
			} : undefined,
			maxResultCount: 20
		};

		const fieldMask = [
			'places.id',
			'places.displayName',
			'places.formattedAddress',
			'places.rating',
			'places.userRatingCount',
			'places.photos',
			'places.websiteUri',
			'places.nationalPhoneNumber',
			'places.internationalPhoneNumber',
			'places.businessStatus',
			'places.primaryType',
			'places.types',
			'places.location',
			'places.currentOpeningHours',
			'places.regularOpeningHours',
			'places.priceLevel',
			'places.editorialSummary',
			'places.reviews'
		].join(',');

		const response = await axios.post(
			'https://places.googleapis.com/v1/places:searchText',
			body,
			{
				headers: {
					'Content-Type': 'application/json',
					'X-Goog-Api-Key': process.env.GOOGLE_API_KEY,
					'X-Goog-FieldMask': fieldMask
				},
			}
		);
		const places = Array.isArray(response.data.places) ? response.data.places : [];
		const results = places.map((place) => {
			const result = {
				placeId: place.id,
				name: place.displayName?.text || place.name,
				address: place.formattedAddress,
				rating: place.rating,
				userRatingCount: place.userRatingCount || 0,
				types: place.types || [],
				photoReference: place.photos?.[0]?.name || null,
				photoCount: place.photos?.length || 0,
				businessStatus: place.businessStatus,
				websiteUri: place.websiteUri,
				nationalPhoneNumber: place.nationalPhoneNumber,
				internationalPhoneNumber: place.internationalPhoneNumber,
				primaryType: place.primaryType,
				latitude: place.location?.latitude,
				longitude: place.location?.longitude,
				openingHours: place.currentOpeningHours?.weekdayDescriptions || place.regularOpeningHours?.weekdayDescriptions || [],
				priceLevel: place.priceLevel,
				description: place.editorialSummary?.text
			};
			return result;
		});
		res.json({ results });
	} catch (error) {
		return REST.error(res, error.message, error.response?.status || 500);
	}
})
router.get('/placesDetails', async function (req, res) {
	try {
		const { placeId } = req.query;
		if (!placeId) {
			return res.status(400).json({ error: 'Missing placeId' });
		}
		const fieldMask = [
			'id',
			'displayName',
			'formattedAddress',
			'rating',
			'userRatingCount',
			'photos',
			'websiteUri',
			'nationalPhoneNumber',
			'internationalPhoneNumber',
			'businessStatus',
			'primaryType',
			'types',
			'location',
			'currentOpeningHours',
			'regularOpeningHours',
			'priceLevel',
			'editorialSummary',
			'reviews'
		].join(',');
		const response = await axios.get(
			`https://places.googleapis.com/v1/places/${placeId}`,
			{
				headers: {
					'X-Goog-Api-Key': process.env.GOOGLE_API_KEY,
					'X-Goog-FieldMask': fieldMask
				},
			}
		);
		const place = response.data;
		const result = {
			placeId: place.id,
			name: place.displayName?.text || place.name,
			address: place.formattedAddress,
			rating: place.rating,
			userRatingCount: place.userRatingCount || 0,
			types: place.types || [],
			photoReference: place.photos?.[0]?.name || null,
			photoCount: place.photos?.length || 0,
			businessStatus: place.businessStatus,
			websiteUri: place.websiteUri,
			nationalPhoneNumber: place.nationalPhoneNumber,
			internationalPhoneNumber: place.internationalPhoneNumber,
			primaryType: place.primaryType,
			latitude: place.location?.latitude,
			longitude: place.location?.longitude,
			openingHours: place.currentOpeningHours?.weekdayDescriptions || place.regularOpeningHours?.weekdayDescriptions || [],
			priceLevel: place.priceLevel,
			description: place.editorialSummary?.text
		};
		res.json({ result });
	} catch (error) {
		return REST.error(res, error.message, error.response?.status || 500);
	}
})
router.get('/getPlacesNearBy', async function (req, res) {
	try {
		const { location, radius, keyword } = req.query;
		if (!location || !keyword) {
			return res.status(400).json({ error: 'Missing location or keyword' });
		}
		const radiusMeters = radius ? Number(radius) : 1000;
		const [lat, lng] = location.split(',').map(Number);
		const body = {
			textQuery: keyword,
			locationBias: {
				circle: {
					center: { latitude: lat, longitude: lng },
					radius: radiusMeters
				}
			},
			maxResultCount: 20
		};
		const fieldMask = [
			'places.id',
			'places.displayName',
			'places.formattedAddress',
			'places.rating',
			'places.userRatingCount',
			'places.photos',
			'places.websiteUri',
			'places.nationalPhoneNumber',
			'places.internationalPhoneNumber',
			'places.businessStatus',
			'places.primaryType',
			'places.types',
			'places.location'
		].join(',');
		const response = await axios.post(
			'https://places.googleapis.com/v1/places:searchText',
			body,
			{
				headers: {
					'Content-Type': 'application/json',
					'X-Goog-Api-Key': process.env.GOOGLE_API_KEY,
					'X-Goog-FieldMask': fieldMask
				},
			}
		);
		const places = Array.isArray(response.data.places) ? response.data.places : [];
		const results = places.map((place) => ({
			place_id: place.id,
			name: place.displayName?.text || place.name,
			formatted_address: place.formattedAddress,
			vicinity: place.formattedAddress,
			rating: place.rating,
			user_ratings_total: place.userRatingCount,
			types: place.types || [],
			photos: place.photos ? [{ photo_reference: place.photos[0]?.name }] : [],
			business_status: place.businessStatus,
			geometry: {
				location: {
					lat: place.location?.latitude,
					lng: place.location?.longitude
				}
			}
		}));
		res.json({ results, status: 'OK' });
	} catch (error) {
		return REST.error(res, error.message, error.response?.status || 500);
	}
})

router.post('/run-maps', async (req, res) => {
    try {
        const {
            keyword,
            centerLat,
            centerLng,
            gridSize = 7,
            stepMeters = 1000,
            searchRadiusMeters = 800,
            maxCrawlPages = 20,
            depth,
            languageCode = 'en',
            device = 'desktop',
            os = 'windows',
            concurrency = Number(process.env.CONCURRENCY || 15),
        } = req.body || {};
        if (!keyword) return res.status(400).json({ error: 'keyword required' });
        if (typeof centerLat !== 'number' || typeof centerLng !== 'number') {
            return res.status(400).json({ error: 'centerLat/centerLng required' });
        }
        const effectiveDepth = typeof depth === 'number' ? depth : maxCrawlPages;
        const startTime = process.hrtime.bigint();
        const cells = await generateGrid({ 
            centerLat, 
            centerLng, 
            gridSize, 
            stepMeters, 
            searchRadiusMeters 
        });
        const limit = pLimit(concurrency);
        const timeout = Number(process.env.REQUEST_TIMEOUT_MS || 20000);
        const jobs = cells.map((c) => limit(async () => {
            const taskStart = process.hrtime.bigint();
            const tasks = [{
                keyword,
                language_code: languageCode,
                location_coordinate: `${c.lat},${c.lng}`,
                depth: effectiveDepth,
                search_this_area: false,
                gps_coordinates: c.gps_coordinates,
                device,
                os,
                tag: c.tag,
            }];


            const data = await postTasks({ type: 'maps', tasks, timeout });
            const task = data?.tasks?.[0];
            const resultBlocks = Array.isArray(task?.result) ? task.result : [];
            let items = [];
            for (const block of resultBlocks) {
                if (Array.isArray(block?.items) && block.items.length) {
                    items = block.items;
                    break;
                }
            }
            
            if (items.length === 0) {
                items = resultBlocks?.[0]?.items || [];
            }
            const taskEnd = process.hrtime.bigint();
            const taskSeconds = Number(taskEnd - taskStart) / 1e9;
            return {
                cell: c,
                items,
                seconds: taskSeconds,
                taskData: task?.data || {},
            };
        }));
        const results = await Promise.all(jobs);
        const tasks = results.map((r) => {
            const lat = typeof r.cell?.lat === 'number' ? r.cell.lat : centerLat;
            const lng = typeof r.cell?.lng === 'number' ? r.cell.lng : centerLng;
            const taskId = uuidv4();
            return {
                id: taskId,
                status_code: 20000,
                status_message: 'Ok.',
                time: `${r.seconds.toFixed(4)} sec.`,
                cost: 0.0,
                result_count: 1,
                path: ['v3', 'serp', 'google', 'maps', 'live', 'advanced'],
                data: {
                    api: 'serp',
                    function: 'live',
                    se: 'google',
                    se_type: 'maps',
                    keyword,
                    location_coordinate: `${lat},${lng}`,
                    language_name: 'English',
                    language_code: languageCode,
                    device,
                    depth: effectiveDepth,
                    search_this_area: false,
                    os,
                    gps_coordinates: r.cell.gps_coordinates,
                    grid_position: {
                        cellId: r.cell.cellId,
                        i: r.cell.i,
                        j: r.cell.j,
                        lat: r.cell.lat,
                        lng: r.cell.lng
                    }
                },
                result: [
                    {
                        keyword,
                        type: 'maps',
                        se_domain: 'google.com',
                        location_code: 2356,
                        language_code: languageCode,
                        depth: effectiveDepth,
                        check_url: `https://google.com/maps/search/${encodeURIComponent(keyword)}/@${lat},${lng},17z?hl=${languageCode}&gl=IN`,
                        datetime: new Date().toISOString(),
                        spell: null,
                        refinement_chips: null,
                        item_types: ['maps_search'],
                        se_results_count: 0,
                        items_count: r.items.length,
                        items: r.items,
                    }
                ]
            };
        });

        const endTime = process.hrtime.bigint();
        const totalSeconds = Number(endTime - startTime) / 1e9;
        const responseEnvelope = {
            version: '0.1.20250922',
            status_code: 20000,
            status_message: 'Ok.',
            time: `${totalSeconds.toFixed(4)} sec.`,
            cost: 0.0,
            tasks_count: tasks.length, 
            tasks_error: 0,
            tasks: tasks,
        };
        return res.status(200).json(responseEnvelope);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


module.exports = router;
