/**
 * Post Scheduler Routes
 * @description Routes for scheduling posts with GMB photo uploads
 */

const express = require('express');
const router = express.Router();
const { schedulePostWithImage } = require('../controllers/postSchedulerController');
const middleware = require('../../utils/middleware');

/**
 * @route   POST /api/v1/post-scheduler/schedule-with-image
 * @desc    Schedule a post with image upload to GMB
 * @access  Private (requires authentication)
 */
router.post('/schedule-with-image', middleware.verifyAuthenticate, schedulePostWithImage);

module.exports = router;
