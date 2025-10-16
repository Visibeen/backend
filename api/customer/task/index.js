/**
 * Customer Task Module Index
 * @description Entry point for customer task routes
 */

const express = require('express');
const router = express.Router();
const taskController = require('../../controllers/taskController');

/**
 * Customer Task Routes
 * All routes are prefixed with /api/v1/customer/task
 * Authentication handled by parent router
 */

// POST routes
router.post('/save-ai-tasks', taskController.saveAITasks);

// GET routes - customer can view their own tasks
router.get('/my-tasks', taskController.getMyTasks);
router.get('/profile-tasks', taskController.getProfileTasks);

module.exports = router;
