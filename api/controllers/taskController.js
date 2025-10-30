/**
 * Task Controller
 * @description Handles all task-related operations with proper error handling and validation
 * @author Senior Backend Developer
 */

const { Task, User, GmbAccount } = require('../../models');
const { Op } = require('sequelize');
const REST = require('../../utils/REST');
const whatsappService = require('../../services/whatsappService');
const emailService = require('../../services/emailService');

/**
 * Helper function to normalize task title for duplicate detection
 */
const normalizeTaskTitle = (title) => {
  return title
    .toLowerCase()
    .replace(/\d+/g, 'X') // Replace numbers with X
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
};

/**
 * Helper function to check if a task is scheduled for now or in the past
 * @param {string} assignDate - The date in YYYY-MM-DD format
 * @param {string} assignTime - The time in HH:MM format (optional)
 * @returns {boolean} - True if the task should be shown now
 */
const isTaskScheduledForNowOrPast = (assignDate, assignTime) => {
  if (!assignDate) {
    return true; // No date means show immediately
  }

  try {
    const now = new Date();
    
    // Parse the assign date
    const [year, month, day] = assignDate.split('-').map(Number);
    
    // If time is provided, use it; otherwise use start of day (00:00)
    let scheduledDateTime;
    if (assignTime) {
      const [hours, minutes] = assignTime.split(':').map(Number);
      scheduledDateTime = new Date(year, month - 1, day, hours, minutes, 0);
    } else {
      scheduledDateTime = new Date(year, month - 1, day, 0, 0, 0);
    }
    
    // Return true if scheduled time has passed
    return now >= scheduledDateTime;
  } catch (error) {
    console.error('Error parsing task schedule:', error);
    return true; // Show task on error to be safe
  }
};

/**
 * Check if a similar task already exists for this client/profile
 */
const checkForDuplicateTask = async (title, clientId, profileId) => {
  try {
    const normalizedTitle = normalizeTaskTitle(title);
    
    // Get all pending tasks for this client/profile
    const existingTasks = await Task.findAll({
      where: {
        assigned_to_client_id: clientId,
        assigned_to_profile_id: profileId || null,
        status: { [Op.ne]: 'completed' } // Only check pending tasks
      },
      attributes: ['id', 'title']
    });
    
    // Check if any existing task has a similar normalized title
    for (const task of existingTasks) {
      const existingNormalized = normalizeTaskTitle(task.title);
      if (existingNormalized === normalizedTitle) {
        console.log(`🚫 Duplicate task detected: "${title}" matches existing task "${task.title}"`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for duplicate tasks:', error);
    return false; // Continue with task creation on error
  }
};

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
      notes,
      attachments // array of file paths
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

    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 [CREATE TASK] Admin creating task');
    console.log('   assignedTo:', assignedTo);
    console.log('   Parsed clientId:', clientId);
    console.log('   Parsed profileId:', profileId);
    console.log('═══════════════════════════════════════════════════════');

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

    // Check for duplicate tasks before creating
    const isDuplicate = await checkForDuplicateTask(title, clientId, profileId);
    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: 'A similar task already exists for this client. Please check existing tasks before creating a new one.'
      });
    }

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
      is_visible_to_client: true, // Make task visible to client
      category: category?.trim() || null,
      estimated_hours: estimatedHours || null,
      tags: tags?.trim() || null,
      notes: notes?.trim() || null,
      attachments: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
      created_by: createdBy
    });

    console.log('✅ [CREATE TASK] Admin task created successfully:', {
      taskId: task.id,
      title: task.title,
      clientId: task.assigned_to_client_id,
      profileId: task.assigned_to_profile_id,
      createdByType: task.created_by_type
    });
    console.log('═══════════════════════════════════════════════════════');

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

    // ✅ Send notifications based on assigned date/time
    // If no date OR date/time is now/past → send immediately
    // If date/time is in future → cron job will send at scheduled time
    const shouldSendImmediately = !assignDate || isTaskScheduledForNowOrPast(assignDate, assignTime);

    if (shouldSendImmediately) {
      // Send WhatsApp notification to assigned client
      if (client.phone_number) {
        try {
          const whatsappResult = await whatsappService.sendTaskAssignmentNotification({
            phoneNumber: client.phone_number,
            userName: client.full_name,
            taskTitle: title,
            taskDescription: description,
            priority: priority || 'medium',
            dueDate: assignDate,
            businessName: profileName,
            taskId: task.id.toString()
          });
          
          if (whatsappResult.success) {
            console.log(`📱 WhatsApp notification sent for task ${task.id}`);
          }
        } catch (e) {
          console.error(`⚠️ WhatsApp send failed for task ${task.id}:`, e.message);
        }
      } else {
        console.log(`⚠️ No phone number for client ${clientId}, WhatsApp notification skipped`);
      }

      // Send Email notification if client has email
      if (client.email) {
        try {
          await emailService.sendTaskAssignmentEmail({
            to: client.email,
            userName: client.full_name || client.name,
            taskTitle: title,
            taskDescription: description,
            priority: priority || 'medium',
            dueDate: assignDate,
            businessName: profileName,
            taskId: task.id?.toString()
          });
          console.log(`✉️ Email notification sent for task ${task.id} to ${client.email}`);
        } catch (e) {
          console.error(`❌ Email send failed for task ${task.id}:`, e.message);
          console.error('Error details:', e);
        }
      } else {
        console.log(`⚠️ No email for client ${clientId}, email notification skipped`);
      }

      // ✅ Mark notifications as sent with timestamp (prevents duplicate emails!)
      await task.update({ 
        notifications_sent: true,
        notification_sent_at: new Date()
      });
      console.log(`✅ Marked task ${task.id} notifications as sent (immediate)`);
    } else {
      console.log(`⏰ Task ${task.id} scheduled for ${assignDate} ${assignTime || ''} - notifications will be sent at scheduled time`);
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

    console.log('═══════════════════════════════════════════════════════');
    console.log('🤖 [SAVE AI TASKS] Client saving AI tasks');
    console.log(`   Number of tasks: ${tasks.length}`);
    console.log(`   clientId: ${clientId}`);
    console.log(`   profileId: ${profileId}`);
    console.log(`   profileName: ${profileName}`);
    console.log('═══════════════════════════════════════════════════════');

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
      notes,
      completed_at,
      completion_data
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
    if (completed_at !== undefined) updateData.completed_at = completed_at;
    if (completion_data !== undefined) updateData.completion_data = completion_data;

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

    // Send Email notification if status changed and email exists
    if (status !== undefined && oldStatus !== status && task.assignedClient?.email) {
      try {
        await emailService.sendTaskUpdateEmail({
          to: task.assignedClient.email,
          userName: task.assignedClient.full_name || task.assignedClient.name,
          taskTitle: updatedTask.title,
          oldStatus,
          newStatus: status,
          businessName: updatedTask.assigned_to_profile_name
        });
        console.log(`✉️ Email status update notification sent for task ${id}`);
      } catch (e) {
        console.warn('⚠️ Email status update send failed:', e.message);
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

    console.log('═══════════════════════════════════════════════════════');
    console.log('🗑️ [DELETE TASK] Deleting task:', {
      taskId: task.id,
      title: task.title,
      createdByType: task.created_by_type,
      profileId: task.assigned_to_profile_id,
      deletedBy: req.user?.id
    });

    await task.destroy();

    console.log(`✅ [DELETE TASK] Task deleted successfully: ${id}`);
    console.log('═══════════════════════════════════════════════════════');

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

    const allTasks = await Task.findAll({
      where: {
        assigned_to_client_id: userId
      },
      order: [['created_at', 'DESC']]
    });

    // Filter tasks to only show those that have reached their scheduled date/time
    const tasks = allTasks.filter(task => {
      return isTaskScheduledForNowOrPast(task.assign_date, task.assign_time);
    });

    console.log(`📋 Filtered ${tasks.length} tasks out of ${allTasks.length} for user ${userId} (hiding future scheduled tasks)`);

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

    // Live diagnostics
    try {
      const byType = tasks.reduce((acc, t) => {
        const key = (t.created_by_type || 'unknown').toString();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const byProfileMatch = tasks.reduce((acc, t) => {
        const pid = (t.assigned_to_profile_id || '').toString();
        const numPid = pid.replace('locations/', '');
        const matches = pid === profileId || pid === numericProfileId || numPid === numericProfileId;
        if (matches) acc.matches = (acc.matches || 0) + 1; else acc.misses = (acc.misses || 0) + 1;
        return acc;
      }, { matches: 0, misses: 0 });
      console.log('🧪 getProfileTasks diagnostics:', {
        total: tasks.length,
        created_by_type_counts: byType,
        profile_match: byProfileMatch,
        sample: tasks.slice(0, 3).map(t => ({
          id: t.id,
          title: t.title,
          created_by_type: t.created_by_type,
          is_visible_to_client: t.is_visible_to_client,
          assigned_to_profile_id: t.assigned_to_profile_id,
          assign_date: t.assign_date,
          assign_time: t.assign_time,
          created_at: t.created_at
        }))
      });
    } catch (e) {
      console.log('⚠️ getProfileTasks diagnostics logging failed:', e?.message || e);
    }

    // Filter by profile ID (flexible matching) and scheduled date/time
    const filteredTasks = tasks.filter(task => {
      const taskProfileId = task.assigned_to_profile_id?.toString() || '';
      const taskNumericId = taskProfileId.replace('locations/', '');
      
      // Check if task belongs to this profile
      const belongsToProfile = taskProfileId === profileId || 
                               taskProfileId === numericProfileId ||
                               taskNumericId === numericProfileId;
      
      if (!belongsToProfile) {
        return false;
      }
      
      // Always show ADMIN-created tasks regardless of schedule time
      const createdByType = (task.created_by_type || '').toString().toLowerCase();
      if (createdByType === 'admin') {
        return true;
      }

      // Check if task is scheduled for now or past (applies to AI/default tasks)
      return isTaskScheduledForNowOrPast(task.assign_date, task.assign_time);
    });

    // Deduplicate tasks by display-intent while PREFERRING ADMIN tasks over AI
    // Preference rules within same title+description bucket:
    // 1) admin over ai
    // 2) incomplete over completed
    // 3) newest by created_at
    const normalize = (s) => (s || '')
      .toString()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    const bestByKey = new Map();

    const prefer = (existing, candidate) => {
      const existingType = (existing.created_by_type || '').toString().toLowerCase();
      const candidateType = (candidate.created_by_type || '').toString().toLowerCase();
      const existingIsAdmin = existingType === 'admin';
      const candidateIsAdmin = candidateType === 'admin';
      if (candidateIsAdmin && !existingIsAdmin) return true;
      if (existingIsAdmin && !candidateIsAdmin) return false;

      const existingIncomplete = !(existing.completed || existing.status === 'completed');
      const candidateIncomplete = !(candidate.completed || candidate.status === 'completed');
      if (candidateIncomplete && !existingIncomplete) return true;
      if (existingIncomplete && !candidateIncomplete) return false;

      const existingCreated = new Date(existing.created_at || 0).getTime();
      const candidateCreated = new Date(candidate.created_at || 0).getTime();
      if (candidateCreated > existingCreated) return true;
      return false;
    };

    for (const task of filteredTasks) {
      const key = normalize(`${task.title}|${task.description}`);
      const current = bestByKey.get(key);
      if (!current || prefer(current, task)) {
        bestByKey.set(key, task);
      } else {
        console.log(`⚠️ Skipping duplicate task (kept preferred): ${task.title} (ID: ${task.id})`);
      }
    }

    const uniqueTasks = Array.from(bestByKey.values());

    console.log(`✅ Found ${filteredTasks.length} tasks, returning ${uniqueTasks.length} unique tasks for profile ${profileId}`);

    return res.status(200).json({
      success: true,
      data: { tasks: uniqueTasks }
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
      attachments, // array of file paths
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
      selectedProfilesCount: selectedProfiles?.length || 0,
      attachmentsCount: attachments?.length || 0
    });

    let targetProfiles = [];

    if (assignToAll) {
      // Get all GMB accounts from database
      const allAccounts = await GmbAccount.findAll({
        attributes: ['id', 'user_id', 'location_id', 'business_name'],
        where: {
          location_id: { [Op.ne]: null }
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
      const clientAccounts = await GmbAccount.findAll({
        attributes: ['id', 'user_id', 'location_id', 'business_name'],
        where: {
          user_id: { [Op.in]: selectedClients },
          location_id: { [Op.ne]: null }
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
        // Check for duplicate task
        const isDuplicate = await checkForDuplicateTask(title, profile.clientId, profile.profileId);
        if (isDuplicate) {
          console.log(`⚠️ Skipping duplicate task for profile ${profile.profileId} (${profile.profileName})`);
          errors.push({
            profileId: profile.profileId,
            profileName: profile.profileName,
            error: 'Duplicate task - similar task already exists'
          });
          continue; // Skip this profile
        }

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
          attachments: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
          created_by: createdBy,
          created_by_type: 'admin',
          is_visible_to_client: true
        });

        createdTasks.push(task);

        // ✅ NEW: Send immediate notifications if task is scheduled for now/past
        const shouldSendImmediately = !assignDate || isTaskScheduledForNowOrPast(assignDate, assignTime);
        
        if (shouldSendImmediately) {
          // Get client details for notifications
          const client = await User.findByPk(profile.clientId);
          
          if (client) {
            // Send WhatsApp notification
            if (client.phone_number) {
              try {
                const whatsappResult = await whatsappService.sendTaskAssignmentNotification({
                  phoneNumber: client.phone_number,
                  userName: client.full_name,
                  taskTitle: title,
                  taskDescription: description,
                  priority: priority || 'medium',
                  dueDate: assignDate,
                  businessName: profile.profileName,
                  taskId: task.id.toString()
                });
                
                if (whatsappResult.success) {
                  console.log(`📱 WhatsApp notification sent for bulk task ${task.id}`);
                }
              } catch (e) {
                console.error(`WhatsApp send failed for task ${task.id}:`, e.message);
              }
            }

            // Send Email notification
            if (client.email) {
              try {
                await emailService.sendTaskAssignmentEmail({
                  to: client.email,
                  userName: client.full_name || client.name,
                  taskTitle: title,
                  taskDescription: description,
                  priority: priority || 'medium',
                  dueDate: assignDate,
                  businessName: profile.profileName,
                  taskId: task.id.toString()
                });
                console.log(`✉️ Email notification sent for bulk task ${task.id} to ${client.email}`);
              } catch (e) {
                console.error(`❌ Email send failed for bulk task ${task.id}:`, e.message);
                console.error('Error details:', e);
              }
            }

            // ✅ Mark notifications as sent
            await task.update({ 
              notifications_sent: true,
              notification_sent_at: new Date()
            });
            console.log(`✅ Marked bulk task ${task.id} notifications as sent (immediate)`);
          }
        } else {
          console.log(`⏰ Bulk task ${task.id} scheduled for ${assignDate} ${assignTime || ''} - notifications will be sent at scheduled time`);
        }
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

/**
 * @desc    Upload task photo to GMB
 * @route   POST /api/admin/tasks/upload-photo-to-gmb
 * @access  Admin
 */
const uploadTaskPhotoToGMB = async (req, res) => {
  const axios = require('axios');
  const fs = require('fs');
  const path = require('path');
  
  try {
    console.log('📸 [Task GMB Upload] Starting photo upload...');
    
    const { accountId, locationId, category = 'ADDITIONAL', taskId } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    // Validation
    if (!accessToken) {
      return REST.error(res, 'Access token is required', 401);
    }

    if (!accountId || !locationId) {
      return REST.error(res, 'Account ID and Location ID are required', 400);
    }

    if (!req.files || !req.files.photo) {
      return REST.error(res, 'Photo file is required', 400);
    }

    const photoFile = req.files.photo;
    console.log('📷 [Task GMB Upload] Photo details:', {
      name: photoFile.name,
      size: photoFile.size,
      mimetype: photoFile.mimetype
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(photoFile.mimetype)) {
      return REST.error(res, 'Only JPG, PNG, and GIF images are allowed', 400);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (photoFile.size > maxSize) {
      return REST.error(res, 'Photo size must be less than 10MB', 400);
    }

    // Save photo temporarily
    console.log('💾 [Task GMB Upload] Saving photo temporarily...');
    const uploadsDir = path.join(__dirname, '../../uploads/temp');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const tempFileName = `gmb_task_${Date.now()}_${photoFile.name}`;
    const tempFilePath = path.join(uploadsDir, tempFileName);
    
    fs.writeFileSync(tempFilePath, photoFile.data);
    console.log('✅ [Task GMB Upload] Photo saved:', tempFileName);
    
    // Create public URL
    const publicUrl = `${process.env.PUBLIC_URL || 'http://localhost:5000'}/uploads/temp/${tempFileName}`;
    console.log('🔗 [Task GMB Upload] Public URL:', publicUrl);
    
    // Upload to GMB
    console.log('🔄 [Task GMB Upload] Uploading to GMB...');
    const createMediaUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media`;
    
    const mediaData = {
      mediaFormat: 'PHOTO',
      locationAssociation: {
        category: category
      },
      sourceUrl: publicUrl
    };

    const createMediaResponse = await axios.post(
      createMediaUrl,
      mediaData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const mediaItem = createMediaResponse.data;
    console.log('✅ [Task GMB Upload] Photo uploaded to GMB:', mediaItem.name);
    
    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
      console.log('🗑️ [Task GMB Upload] Temporary file cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ [Task GMB Upload] Failed to clean up temp file:', cleanupError.message);
    }

    // Update task attachments if taskId provided
    if (taskId) {
      const task = await Task.findByPk(taskId);
      if (task) {
        const currentAttachments = task.attachments ? JSON.parse(task.attachments) : [];
        currentAttachments.push(mediaItem.googleUrl || mediaItem.sourceUrl);
        await task.update({ attachments: JSON.stringify(currentAttachments) });
        console.log('✅ [Task GMB Upload] Task attachments updated');
      }
    }

    return REST.success(res, {
      mediaItem: {
        name: mediaItem.name,
        googleUrl: mediaItem.googleUrl,
        sourceUrl: mediaItem.sourceUrl,
        thumbnailUrl: mediaItem.thumbnailUrl
      }
    }, 'Photo uploaded to GMB successfully');

  } catch (error) {
    console.error('❌ [Task GMB Upload] Error:', error.message);
    
    if (error.response) {
      console.error('❌ [Task GMB Upload] API Error:', error.response.data);
      return REST.error(
        res,
        error.response.data?.error?.message || 'Failed to upload photo to GMB',
        error.response.status
      );
    }

    return REST.error(res, error.message || 'Failed to upload photo to GMB', 500);
  }
};

/**
 * @desc    Complete task (Customer access)
 * @route   PUT /api/customer/task/complete/:id
 * @access  Customer
 */
const completeTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.current_user?.id || req.user?.id;
    const { completed_at, completion_data } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Find task and verify it belongs to this user
    const task = await Task.findOne({
      where: {
        id: id,
        assigned_to_client_id: userId
      },
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
        message: 'Task not found or you do not have permission to update it'
      });
    }

    // Check if already completed
    if (task.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Task is already completed'
      });
    }

    // Store old status for WhatsApp notification
    const oldStatus = task.status;

    // Update task to completed
    await task.update({
      status: 'completed',
      completed_at: completed_at || new Date(),
      completion_data: completion_data || null,
      updated_by: userId
    });

    console.log(`✅ Task ${id} completed by customer ${userId}`);

    // Send WhatsApp notification if phone number available
    if (task.assignedClient?.phone_number) {
      const whatsappResult = await whatsappService.sendTaskUpdateNotification({
        phoneNumber: task.assignedClient.phone_number,
        userName: task.assignedClient.full_name,
        taskTitle: task.title,
        oldStatus: oldStatus,
        newStatus: 'completed',
        businessName: task.assigned_to_profile_name
      });
      
      if (whatsappResult.success) {
        console.log(`📱 WhatsApp completion notification sent for task ${id}`);
      }
    }

    // Send Email notification on completion if email exists
    if (task.assignedClient?.email) {
      try {
        await emailService.sendTaskUpdateEmail({
          to: task.assignedClient.email,
          userName: task.assignedClient.full_name || task.assignedClient.name,
          taskTitle: task.title,
          oldStatus,
          newStatus: 'completed',
          businessName: task.assigned_to_profile_name
        });
        console.log(`✉️ Email completion notification sent for task ${id}`);
      } catch (e) {
        console.warn('⚠️ Email completion send failed:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      data: { task },
      message: 'Task completed successfully'
    });

  } catch (error) {
    console.error('Error in completeTask:', error);
    return REST.error(res, error.message, 500);
  }
};

/**
 * @desc    Send notifications for scheduled tasks that have reached their scheduled time
 * @route   POST /api/admin/tasks/process-scheduled-notifications
 * @access  Internal/Cron
 * @info    This should be called periodically (e.g., every 5-15 minutes) by a cron job
 */
const processScheduledNotifications = async (req, res) => {
  try {
    console.log('⏰ [SCHEDULED NOTIFICATIONS] Processing scheduled task notifications...');
    
    // Find all pending tasks that:
    // 1. Have a scheduled date/time
    // 2. The scheduled time has arrived
    // 3. Notifications have NOT been sent yet (NEW CHECK - prevents duplicates!)
    const allTasks = await Task.findAll({
      where: {
        status: 'pending',
        assign_date: { [Op.ne]: null }, // Has a scheduled date
        notifications_sent: false // ✅ NEW: Only get tasks where notifications NOT sent
      },
      include: [
        {
          model: User,
          as: 'assignedClient',
          attributes: ['id', 'email', 'full_name', 'phone_number'],
          required: true
        }
      ]
    });

    let processedCount = 0;
    let notificationsSent = 0;

    for (const task of allTasks) {
      // Check if this task's scheduled time has arrived
      if (isTaskScheduledForNowOrPast(task.assign_date, task.assign_time)) {
        processedCount++;

        // Send WhatsApp notification
        if (task.assignedClient.phone_number) {
          try {
            const whatsappResult = await whatsappService.sendTaskAssignmentNotification({
              phoneNumber: task.assignedClient.phone_number,
              userName: task.assignedClient.full_name,
              taskTitle: task.title,
              taskDescription: task.description,
              priority: task.priority,
              dueDate: task.assign_date,
              businessName: task.assigned_to_profile_name,
              taskId: task.id.toString()
            });
            
            if (whatsappResult.success) {
              console.log(`📱 Scheduled WhatsApp notification sent for task ${task.id}`);
              notificationsSent++;
            }
          } catch (e) {
            console.error(`Failed to send WhatsApp for task ${task.id}:`, e.message);
          }
        }

        // Send Email notification
        if (task.assignedClient.email) {
          try {
            await emailService.sendTaskAssignmentEmail({
              to: task.assignedClient.email,
              userName: task.assignedClient.full_name,
              taskTitle: task.title,
              taskDescription: task.description,
              priority: task.priority,
              dueDate: task.assign_date,
              businessName: task.assigned_to_profile_name,
              taskId: task.id.toString()
            });
            console.log(`✉️ Scheduled email notification sent for task ${task.id}`);
            notificationsSent++;
          } catch (e) {
            console.error(`Failed to send email for task ${task.id}:`, e.message);
          }
        }

        // ✅ NEW: Mark notifications as sent with timestamp (prevents duplicate emails!)
        await task.update({ 
          notifications_sent: true,
          notification_sent_at: new Date()
        }, { silent: false });
        
        console.log(`✅ Marked task ${task.id} notifications as sent`);
      }
    }

    console.log(`✅ [SCHEDULED NOTIFICATIONS] Processed ${processedCount} tasks, sent ${notificationsSent} notifications`);

    return res ? res.status(200).json({
      success: true,
      message: `Processed ${processedCount} scheduled tasks`,
      data: { 
        processedCount, 
        notificationsSent 
      }
    }) : { processedCount, notificationsSent };

  } catch (error) {
    console.error('Error in processScheduledNotifications:', error);
    if (res) {
      return REST.error(res, error.message, 500);
    }
    throw error;
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
  completeTask,
  toggleTaskVisibility,
  deleteTask,
  getTasksByClient,
  getTaskStatistics,
  bulkUpdateStatus,
  uploadTaskPhotoToGMB,
  processScheduledNotifications
};
