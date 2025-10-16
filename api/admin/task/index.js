/**
 * Task Module Index
 * @description Entry point for task management routes
 * @author Senior Backend Developer
 */

const express = require('express');
const router = express.Router();
const taskController = require('../../../api/controllers/taskController');

/**
 * Task Management Routes
 * All routes are prefixed with /api/admin/task
 * Authentication and admin authorization handled by parent router
 */

// GET routes
router.get('/get-tasks', taskController.getTasks);
router.get('/get-task/:id', taskController.getTaskById);
router.get('/client/:clientId', taskController.getTasksByClient);
router.get('/statistics', taskController.getTaskStatistics);

// POST routes
router.post('/create-task', taskController.createTask);
router.post('/bulk-assign-task', taskController.bulkAssignTask);
router.post('/save-ai-tasks', taskController.saveAITasks);

// PUT routes
router.put('/update-task/:id', taskController.updateTask);
router.put('/toggle-visibility/:id', taskController.toggleTaskVisibility);
router.put('/bulk-update-status', taskController.bulkUpdateStatus);

// DELETE routes
router.delete('/delete-task/:id', taskController.deleteTask);

module.exports = router;
