const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Get all registered users
router.get('/get-users', userController.getUsers);

// Get user details by ID
router.get('/get-user/:userId', userController.getUserById);

// Generate admin access token for user
router.post('/generate-admin-access/:userId', userController.generateAdminAccessToken);

module.exports = router;
