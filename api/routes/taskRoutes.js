/**
 * Task Routes
 * @description Defines all routes for task management
 * @author Senior Backend Developer
 */

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/admin/tasks/get-tasks
 * @desc    Get all tasks with pagination and filtering
 * @access  Admin
 * @query   page, size, status, priority, clientId, search, sortBy, sortOrder
 */
router.get('/get-tasks', isAdmin, taskController.getTasks);

/**
 * @route   GET /api/admin/tasks/get-task/:id
 * @desc    Get single task by ID
 * @access  Admin
 * @params  id - Task ID
 */
router.get('/get-task/:id', isAdmin, taskController.getTaskById);

/**
 * @route   POST /api/admin/tasks/create-task
 * @desc    Create new task
 * @access  Admin
 * @body    title, description, assignedTo, priority, status, dueDate, category, estimatedHours, tags, notes
 */
router.post('/create-task', isAdmin, taskController.createTask);

/**
 * @route   PUT /api/admin/tasks/update-task/:id
 * @desc    Update existing task
 * @access  Admin
 * @params  id - Task ID
 * @body    title, description, assignedTo, priority, status, dueDate, category, estimatedHours, actualHours, tags, notes
 */
router.put('/update-task/:id', isAdmin, taskController.updateTask);

/**
 * @route   DELETE /api/admin/tasks/delete-task/:id
 * @desc    Delete task
 * @access  Admin
 * @params  id - Task ID
 */
router.delete('/delete-task/:id', isAdmin, taskController.deleteTask);

/**
 * @route   GET /api/admin/tasks/client/:clientId
 * @desc    Get all tasks for a specific client
 * @access  Admin
 * @params  clientId - Client user ID
 * @query   status, priority
 */
router.get('/client/:clientId', isAdmin, taskController.getTasksByClient);

/**
 * @route   GET /api/admin/tasks/statistics
 * @desc    Get task statistics
 * @access  Admin
 * @query   clientId, startDate, endDate
 */
router.get('/statistics', isAdmin, taskController.getTaskStatistics);

/**
 * @route   PUT /api/admin/tasks/bulk-update-status
 * @desc    Bulk update task status
 * @access  Admin
 * @body    taskIds (array), status
 */
router.put('/bulk-update-status', isAdmin, taskController.bulkUpdateStatus);

/**
 * @route   POST /api/admin/tasks/upload-photo-to-gmb
 * @desc    Upload task photo to GMB profile
 * @access  Admin
 * @body    accountId, locationId, category, taskId (optional)
 * @files   photo (image file)
 */
router.post('/upload-photo-to-gmb', isAdmin, taskController.uploadTaskPhotoToGMB);

module.exports = router;
