/**
 * Task Controller
 * @description Handles all task-related operations with proper error handling and validation
 * @author Senior Backend Developer
 */

const { Task, User, GmbAccount } = require('../../models');
const { Op } = require('sequelize');
const REST = require('../../utils/REST');
const whatsappService = require('../../services/whatsappService');

/**
 * @desc    Get all tasks with pagination, filtering, and sorting
 * @route   GET /api/admin/tasks/get-tasks
 * @access  Admin
 */
const getTasks = async (req, res) => {
  try {
    const {
      page = 1,
      size = 10,
      status,
      priority,
      clientId,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause for filtering
    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (priority) {
      whereClause.priority = priority;
    }

    if (clientId) {
      whereClause.assigned_to_client_id = clientId;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } },
        { tags: { [Op.like]: `%${search}%` } }
      ];
    }

    // Calculate pagination
    const limit = parseInt(size);
    const offset = (parseInt(page) - 1) * limit;

    // Validate sort field
    const allowedSortFields = ['created_at', 'updated_at', 'assign_date', 'priority', 'status', 'title'];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Fetch tasks with associations
    const { count, rows: tasks } = await Task.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'assignedClient',
          attributes: ['id', 'email', 'full_name'],
          required: false // LEFT JOIN instead of INNER JOIN
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'full_name'],
          required: false // LEFT JOIN instead of INNER JOIN
        }
      ],
      limit,
      offset,
      order: [[orderField, orderDirection]],
      distinct: true
    });

    // Calculate statistics
    const stats = await Task.findAll({
      attributes: [
        'status',
        [Task.sequelize.fn('COUNT', Task.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const statistics = {
      total: count,
      pending: stats.find(s => s.status === 'pending')?.get('count') || 0,
      inProgress: stats.find(s => s.status === 'in-progress')?.get('count') || 0,
      completed: stats.find(s => s.status === 'completed')?.get('count') || 0,
      cancelled: stats.find(s => s.status === 'cancelled')?.get('count') || 0
    };

    return res.status(200).json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: {
        tasks,
        pagination: {
          currentPage: parseInt(page),
          pageSize: limit,
          totalItems: count,
          totalPages: Math.ceil(count / limit)
        },
        statistics
      }
    });

  } catch (error) {
    console.error('Error in getTasks:', error);
    return REST.error(res, error.message, 500);
  }
};

/**
 * @desc    Get single task by ID
 * @route   GET /api/admin/tasks/get-task/:id
 * @access  Admin
 */
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignedClient',
          attributes: ['id', 'email', 'full_name'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'full_name'],
          required: false
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task retrieved successfully',
      data: { task }
    });

  } catch (error) {
    console.error('Error in getTaskById:', error);
    return REST.error(res, error.message, 500);
  }
};

/**
 * @desc    Create new task
 * @route   POST /api/admin/tasks/create-task
 * @access  Admin
 */
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      assignedTo, // Format: "clientId-profileId"
      priority,
      status,
      assignDate,
      assignTime,
      category,
      estimatedHours,
      tags,
      notes
    } = req.body;

    // Validate required fields
    if (!title || !assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Title and client assignment are required'
      });
    }

    // Parse assignedTo (format: "clientId-profileId")
    const [clientId, profileId] = assignedTo.toString().split('-');

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client assignment format'
      });
    }

    // Verify client exists
    const client = await User.findByPk(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Assigned client not found'
      });
    }

    // Get profile name and auto-sync phone number from GMB account
    let profileName = null;
    let gmbPhoneNumber = null;
    
    if (profileId) {
      // Fetch GMB account to get phone number and business name
      const gmbAccount = await GmbAccount.findOne({
        where: {
          user_id: clientId,
          location_id: profileId
        }
      });

      if (gmbAccount) {
        profileName = gmbAccount.business_name || req.body.profileName || null;
        gmbPhoneNumber = gmbAccount.phone_number;

        // Auto-sync phone number from GMB to user if user doesn't have one
        if (gmbPhoneNumber && !client.phone_number) {
          await client.update({ phone_number: gmbPhoneNumber });
          console.log(`📱 Auto-synced phone number from GMB: ${gmbPhoneNumber} for user ${clientId}`);
          // Refresh client data
          await client.reload();
        } else if (gmbPhoneNumber && client.phone_number !== gmbPhoneNumber) {
          // Update if GMB has different phone number
          await client.update({ phone_number: gmbPhoneNumber });
          console.log(`🔄 Updated phone number from GMB: ${gmbPhoneNumber} for user ${clientId}`);
          await client.reload();
        }
      } else {
        profileName = req.body.profileName || null;
      }
    }

    // Get creator ID from authenticated user
    const createdBy = req.user?.id || null;

    // Check if we need to replace an AI task
    // If admin is creating a task with assign_date, check for AI tasks to replace
    if (assignDate) {
      // Find AI tasks for this client/profile, ordered by priority (low first)
      const aiTaskToReplace = await Task.findOne({
        where: {
          assigned_to_client_id: clientId,
          assigned_to_profile_id: profileId || null,
          created_by_type: 'ai',
          status: 'pending' // Only replace pending AI tasks
        },
        order: [
          ['priority', 'ASC'], // Low priority first
          ['created_at', 'ASC'] // Oldest first
        ]
      });

      // If found, delete the AI task
      if (aiTaskToReplace) {
        await aiTaskToReplace.destroy();
        console.log(`🤖 Replaced AI task "${aiTaskToReplace.title}" with admin task "${title}"`);
      }
    }

    // Create task
    const task = await Task.create({
      title: title.trim(),
      description: description?.trim() || null,
      assigned_to_client_id: clientId,
      assigned_to_profile_id: profileId || null,
      assigned_to_profile_name: profileName,
      priority: priority || 'medium',
      status: status || 'pending',
      assign_date: assignDate || null,
      assign_time: assignTime || null,
      created_by_type: 'admin', // Admin-created task
      category: category?.trim() || null,
      estimated_hours: estimatedHours || null,
      tags: tags?.trim() || null,
      notes: notes?.trim() || null,
      created_by: createdBy
    });

    // Fetch the created task with associations
    const createdTask = await Task.findByPk(task.id, {
      include: [
        {
          model: User,
          as: 'assignedClient',
          attributes: ['id', 'email', 'full_name'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'full_name'],
          required: false
        }
      ]
    });

    console.log(`Task created successfully: ${task.id} by user ${createdBy}`);

    // Send WhatsApp notification to assigned client
    if (client.phone_number) {
      const whatsappResult = await whatsappService.sendTaskAssignmentNotification({
        phoneNumber: client.phone_number,
        userName: client.full_name,
        taskTitle: title,
        taskDescription: description,
        priority: priority || 'medium',
        dueDate: assignDate,
        businessName: profileName
      });
      
      if (whatsappResult.success) {
        console.log(`📱 WhatsApp notification sent for task ${task.id}`);
      }
    } else {
      console.log(`⚠️ No phone number for client ${clientId}, WhatsApp notification skipped`);
    }

    return REST.success(res, { task: createdTask }, 'Task created successfully');

  } catch (error) {
    console.error('Error in createTask:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      const errorMsg = error.errors.map(e => `${e.path}: ${e.message}`).join(', ');
      return REST.error(res, errorMsg, 400);
    }

    return REST.error(res, error.message, 500);
  }
};

/**
 * @desc    Save AI-generated tasks from client TaskManagement page
 * @route   POST /api/admin/tasks/save-ai-tasks
 * @access  Authenticated (Client)
 */
const saveAITasks = async (req, res) => {
  try {
    const {
      tasks,
      clientId,
      profileId,
      profileName
    } = req.body;

    // Validate required fields
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tasks array is required'
      });
    }

    if (!clientId || !profileId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and Profile ID are required'
      });
    }

    console.log(`📥 Saving ${tasks.length} AI tasks for profile: ${profileId}`);

    const savedTasks = [];
    const errors = [];

    // Helper function to parse estimated hours from string
    const parseEstimatedHours = (hoursStr) => {
      if (!hoursStr) return null;
      if (typeof hoursStr === 'number') return hoursStr;
      
      const str = hoursStr.toString().toLowerCase();
      
      // Handle ranges like "2-4h", "45min-1h", "1-2h"
      if (str.includes('-')) {
        const parts = str.split('-');
        let min = 0, max = 0;
        
        // Parse first part
        if (parts[0].includes('h')) {
          min = parseFloat(parts[0].replace('h', ''));
        } else if (parts[0].includes('min')) {
          min = parseFloat(parts[0].replace('min', '')) / 60;
        } else {
          min = parseFloat(parts[0]);
        }
        
        // Parse second part
        if (parts[1].includes('h')) {
          max = parseFloat(parts[1].replace('h', ''));
        } else if (parts[1].includes('min')) {
          max = parseFloat(parts[1].replace('min', '')) / 60;
        } else {
          max = parseFloat(parts[1]);
        }
        
        // Return average
        return ((min + max) / 2).toFixed(2);
      }
      
      // Handle single values like "1h", "45min", "2"
      if (str.includes('h')) {
        return parseFloat(str.replace('h', ''));
      } else if (str.includes('min')) {
        return (parseFloat(str.replace('min', '')) / 60).toFixed(2);
      }
      
      // Try to parse as number
      const num = parseFloat(str);
      return isNaN(num) ? null : num;
    };

    // Helper function to normalize priority
    const normalizePriority = (priority) => {
      if (!priority) return 'medium';
      const p = priority.toLowerCase();
      if (p === 'critical' || p === 'urgent') return 'high';
      if (['low', 'medium', 'high'].includes(p)) return p;
      return 'medium';
    };

    for (const taskData of tasks) {
      try {
        // Check if task already exists (by title and profile)
        const existingTask = await Task.findOne({
          where: {
            title: taskData.title,
            assigned_to_client_id: clientId,
            assigned_to_profile_id: profileId,
            created_by_type: 'ai'
          }
        });

        if (existingTask) {
          console.log(`⏭️  Skipping existing AI task: ${taskData.title}`);
          continue;
        }

        // Parse estimated hours
        const estimatedHours = parseEstimatedHours(taskData.estimatedHours);
        
        // Normalize priority
        const priority = normalizePriority(taskData.priority);

        // Create new AI task
        const task = await Task.create({
          title: taskData.title?.trim() || 'Untitled Task',
          description: taskData.description?.trim() || null,
          assigned_to_client_id: clientId,
          assigned_to_profile_id: profileId,
          assigned_to_profile_name: profileName,
          priority: priority,
          status: taskData.status === 'Completed' ? 'completed' :
                  taskData.status === 'In Progress' ? 'in-progress' : 'pending',
          created_by_type: 'ai',
          category: taskData.category?.trim() || 'AI Generated',
          estimated_hours: estimatedHours,
          tags: taskData.tags?.trim() || null,
          notes: taskData.notes?.trim() || null,
          created_by: req.user?.id || null
        });

        savedTasks.push(task);
        console.log(`✅ Saved AI task: ${task.title}`);
      } catch (taskError) {
        console.error(`❌ Error saving task "${taskData.title}":`, taskError.message);
        errors.push({
          title: taskData.title,
          error: taskError.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully saved ${savedTasks.length} AI tasks`,
      data: {
        savedCount: savedTasks.length,
        skippedCount: tasks.length - savedTasks.length - errors.length,
        errorCount: errors.length,
        tasks: savedTasks,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Error in saveAITasks:', error);
    return REST.error(res, error.message, 500);
  }
};

/**
 * @desc    Update task
 * @route   PUT /api/admin/tasks/update-task/:id
 * @access  Admin
 */
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      assignedTo,
      priority,
      status,
      assignDate,
      assignTime,
      category,
      estimatedHours,
      actualHours,
      tags,
      notes
    } = req.body;

    // Find task with client info
    const task = await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignedClient',
          attributes: ['id', 'email', 'full_name', 'phone_number'],
          required: false
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Store old status for WhatsApp notification
    const oldStatus = task.status;

    // Prepare update data
    const updateData = {
      updated_by: req.user?.id || null
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (assignDate !== undefined) updateData.assign_date = assignDate;
    if (assignTime !== undefined) updateData.assign_time = assignTime;
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (estimatedHours !== undefined) updateData.estimated_hours = estimatedHours;
    if (actualHours !== undefined) updateData.actual_hours = actualHours;
    if (tags !== undefined) updateData.tags = tags?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    // Handle assignedTo change
    if (assignedTo !== undefined) {
      const [clientId, profileId] = assignedTo.toString().split('-');
      
      if (clientId) {
        // Verify client exists
        const client = await User.findByPk(clientId);
        if (!client) {
          return res.status(404).json({
            success: false,
            message: 'Assigned client not found'
          });
        }
        
        updateData.assigned_to_client_id = clientId;
        updateData.assigned_to_profile_id = profileId || null;
        updateData.assigned_to_profile_name = req.body.profileName || null;
      }
    }

    // Update task
    await task.update(updateData);

    // Fetch updated task with associations
    const updatedTask = await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignedClient',
          attributes: ['id', 'email', 'full_name'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'full_name'],
          required: false
        }
      ]
    });

    console.log(`Task updated successfully: ${id} by user ${req.user?.id}`);

    // Send WhatsApp notification if status changed
    if (status !== undefined && oldStatus !== status && task.assignedClient?.phone_number) {
      const whatsappResult = await whatsappService.sendTaskUpdateNotification({
        phoneNumber: task.assignedClient.phone_number,
        userName: task.assignedClient.full_name,
        taskTitle: updatedTask.title,
        oldStatus: oldStatus,
        newStatus: status,
        businessName: updatedTask.assigned_to_profile_name
      });
      
      if (whatsappResult.success) {
        console.log(`📱 WhatsApp status update notification sent for task ${id}`);
      }
    }

    return REST.success(res, { task: updatedTask }, 'Task updated successfully');

  } catch (error) {
    console.error('Error in updateTask:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      const errorMsg = error.errors.map(e => `${e.path}: ${e.message}`).join(', ');
      return REST.error(res, errorMsg, 400);
    }

    return REST.error(res, error.message, 500);
  }
};

/**
 * @desc    Delete task
 * @route   DELETE /api/admin/tasks/delete-task/:id
 * @access  Admin
 */
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await task.destroy();

    console.log(`Task deleted successfully: ${id} by user ${req.user?.id}`);

    return REST.success(res, {}, 'Task deleted successfully');

  } catch (error) {
    console.error('Error in deleteTask:', error);
    return REST.error(res, error.message, 500);
  }
};

/**
 * @desc    Get tasks by client ID
 * @route   GET /api/admin/tasks/client/:clientId
 * @access  Admin
 */
const getTasksByClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { status, priority } = req.query;

    const whereClause = {
      assigned_to_client_id: clientId
    };

    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'assignedClient',
          attributes: ['id', 'name', 'email', 'full_name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'full_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      message: 'Client tasks retrieved successfully',
      data: { tasks, count: tasks.length }
    });

  } catch (error) {
    console.error('Error in getTasksByClient:', error);
    return REST.error(res, error.message, 500);
  }
};

/**
 * @desc    Get task statistics
 * @route   GET /api/admin/tasks/statistics
 * @access  Admin
 */
const getTaskStatistics = async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;

    const whereClause = {};
    
    if (clientId) {
      whereClause.assigned_to_client_id = clientId;
    }

    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get status statistics
    const statusStats = await Task.findAll({
      where: whereClause,
      attributes: [
        'status',
        [Task.sequelize.fn('COUNT', Task.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    // Get priority statistics
    const priorityStats = await Task.findAll({
      where: whereClause,
      attributes: [
        'priority',
        [Task.sequelize.fn('COUNT', Task.sequelize.col('id')), 'count']
      ],
      group: ['priority']
    });

    // Get overdue tasks count
    const overdueCount = await Task.count({
      where: {
        ...whereClause,
        due_date: {
          [Op.lt]: new Date()
        },
        status: {
          [Op.notIn]: ['completed', 'cancelled']
        }
      }
    });

    // Get completion rate
    const totalTasks = await Task.count({ where: whereClause });
    const completedTasks = await Task.count({
      where: { ...whereClause, status: 'completed' }
    });
    const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0;

    return res.status(200).json({
      success: true,
      message: 'Task statistics retrieved successfully',
      data: {
        total: totalTasks,
        byStatus: statusStats.map(s => ({
          status: s.status,
          count: parseInt(s.get('count'))
        })),
        byPriority: priorityStats.map(p => ({
          priority: p.priority,
          count: parseInt(p.get('count'))
        })),
        overdue: overdueCount,
        completionRate: parseFloat(completionRate)
      }
    });

  } catch (error) {
    console.error('Error in getTaskStatistics:', error);
    return REST.error(res, error.message, 500);
  }
};

/**
 * @desc    Bulk update task status
 * @route   PUT /api/admin/tasks/bulk-update-status
 * @access  Admin
 */
const bulkUpdateStatus = async (req, res) => {
  try {
    const { taskIds, status } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Task IDs array is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const updateData = {
      status,
      updated_by: req.user?.id || null
    };

    if (status === 'completed') {
      updateData.completed_at = new Date();
    }

    const [updatedCount] = await Task.update(updateData, {
      where: {
        id: {
          [Op.in]: taskIds
        }
      }
    });

    console.log(`Bulk status update: ${updatedCount} tasks updated to ${status} by user ${req.user?.id}`);

    return REST.success(res, { updatedCount }, `${updatedCount} tasks updated successfully`);

  } catch (error) {
    console.error('Error in bulkUpdateStatus:', error);
    return REST.error(res, error.message, 500);
  }
};

/**
 * @desc    Get tasks for logged-in customer
 * @route   GET /api/customer/task/my-tasks
 * @access  Customer
 */
const getMyTasks = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const tasks = await Task.findAll({
      where: {
        assigned_to_client_id: userId
      },
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: { tasks }
    });

  } catch (error) {
    console.error('Error in getMyTasks:', error);
    return REST.error(res, error.message, 500);
  }
};

/**
 * @desc    Get tasks for a specific profile (customer access)
 * @route   GET /api/customer/task/profile-tasks?profileId=xxx
 * @access  Customer
 */
const getProfileTasks = async (req, res) => {
  try {
    const userId = req.body.current_user?.id || req.user?.id;
    const { profileId } = req.query;
    
    if (!userId) {
      console.error('❌ getProfileTasks: No user ID found in req.body.current_user or req.user');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!profileId) {
      return res.status(400).json({
        success: false,
        message: 'Profile ID is required'
      });
    }

    console.log(`📋 Customer ${userId} fetching tasks for profile: ${profileId}`);

    // Extract numeric ID from location_id (remove "locations/" prefix if present)
    const numericProfileId = profileId.toString().replace('locations/', '');

    // Fetch tasks for this profile that belong to this customer and are visible
    const tasks = await Task.findAll({
      where: {
        assigned_to_client_id: userId,
        is_visible_to_client: true
      },
      order: [['created_at', 'DESC']]
    });

    // Filter by profile ID (flexible matching)
    const filteredTasks = tasks.filter(task => {
      const taskProfileId = task.assigned_to_profile_id?.toString() || '';
      const taskNumericId = taskProfileId.replace('locations/', '');
      
      return taskProfileId === profileId || 
             taskProfileId === numericProfileId ||
             taskNumericId === numericProfileId;
    });

    console.log(`✅ Found ${filteredTasks.length} visible tasks for profile ${profileId}`);

    return res.status(200).json({
      success: true,
      data: { tasks: filteredTasks }
    });

  } catch (error) {
    console.error('Error in getProfileTasks:', error);
    return REST.error(res, error.message, 500);
  }
};

/**
 * @desc    Toggle task visibility to client
 * @route   PUT /api/admin/task/toggle-visibility/:id
 * @access  Admin
 */
const toggleTaskVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVisible } = req.body;

    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Toggle visibility
    await task.update({
      is_visible_to_client: isVisible !== undefined ? isVisible : !task.is_visible_to_client,
      updated_by: req.user?.id || null
    });

    console.log(`👁️ Task visibility toggled: ${task.title} - Visible: ${task.is_visible_to_client}`);

    return REST.success(res, { task }, 'Task visibility updated successfully');

  } catch (error) {
    console.error('Error in toggleTaskVisibility:', error);
    return REST.error(res, error.message, 500);
  }
};

/**
 * @desc    Bulk assign same task to multiple clients/profiles
 * @route   POST /api/admin/task/bulk-assign-task
 * @access  Admin
 */
const bulkAssignTask = async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      status,
      category,
      estimatedHours,
      assignDate,
      assignTime,
      tags,
      assignToAll, // true = assign to all users
      selectedClients, // array of client IDs
      selectedProfiles // array of profile IDs
    } = req.body;

    const createdBy = req.body.current_user?.id || req.user?.id;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required'
      });
    }

    console.log('📋 Bulk task assignment request:', {
      title,
      assignToAll,
      selectedClientsCount: selectedClients?.length || 0,
      selectedProfilesCount: selectedProfiles?.length || 0
    });

    let targetProfiles = [];

    if (assignToAll) {
      // Get all GMB accounts from database
      const allAccounts = await db.GMBAccount.findAll({
        attributes: ['id', 'user_id', 'location_id', 'business_name'],
        where: {
          location_id: { [db.Sequelize.Op.ne]: null }
        }
      });

      targetProfiles = allAccounts.map(account => ({
        clientId: account.user_id,
        profileId: account.location_id,
        profileName: account.business_name
      }));

      console.log(`📊 Found ${targetProfiles.length} profiles to assign task to`);
    } else if (selectedProfiles && selectedProfiles.length > 0) {
      // Assign to specific profiles
      targetProfiles = selectedProfiles;
    } else if (selectedClients && selectedClients.length > 0) {
      // Get all profiles for selected clients
      const clientAccounts = await db.GMBAccount.findAll({
        attributes: ['id', 'user_id', 'location_id', 'business_name'],
        where: {
          user_id: { [db.Sequelize.Op.in]: selectedClients },
          location_id: { [db.Sequelize.Op.ne]: null }
        }
      });

      targetProfiles = clientAccounts.map(account => ({
        clientId: account.user_id,
        profileId: account.location_id,
        profileName: account.business_name
      }));
    }

    if (targetProfiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No profiles found to assign task to'
      });
    }

    // Create tasks for all target profiles
    const createdTasks = [];
    const errors = [];

    for (const profile of targetProfiles) {
      try {
        const task = await Task.create({
          title,
          description,
          assigned_to_client_id: profile.clientId,
          assigned_to_profile_id: profile.profileId,
          assigned_to_profile_name: profile.profileName,
          priority: priority || 'medium',
          status: status || 'pending',
          category,
          estimated_hours: estimatedHours,
          assign_date: assignDate,
          assign_time: assignTime,
          tags,
          created_by: createdBy,
          created_by_type: 'admin',
          is_visible_to_client: true
        });

        createdTasks.push(task);
      } catch (error) {
        console.error(`❌ Error creating task for profile ${profile.profileId}:`, error.message);
        errors.push({
          profileId: profile.profileId,
          profileName: profile.profileName,
          error: error.message
        });
      }
    }

    console.log(`✅ Bulk task assignment completed: ${createdTasks.length} created, ${errors.length} errors`);

    return res.status(200).json({
      success: true,
      message: `Successfully assigned task to ${createdTasks.length} profiles`,
      data: {
        createdCount: createdTasks.length,
        errorCount: errors.length,
        tasks: createdTasks,
        errors
      }
    });

  } catch (error) {
    console.error('Error in bulkAssignTask:', error);
    return REST.error(res, error.message, 500);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  bulkAssignTask,
  saveAITasks,
  getMyTasks,
  getProfileTasks,
  updateTask,
  toggleTaskVisibility,
  deleteTask,
  getTasksByClient,
  getTaskStatistics,
  bulkUpdateStatus
};
