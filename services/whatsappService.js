/**
 * WhatsApp Service with pluggable providers (Meta / AiSensy)
 * @description Sends WhatsApp notifications for task assignments
 * @author Senior Backend Developer
 */

const axios = require('axios');
const AiSensyProvider = require('./whatsappProviders/aisensyProvider');

class WhatsAppService {
  constructor() {
    this.provider = (process.env.WHATSAPP_PROVIDER || 'aisensy').toLowerCase();

    // Meta config
    this.apiUrl = process.env.META_WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
    this.businessAccountId = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;
    this.useTemplates = process.env.META_WHATSAPP_USE_TEMPLATES === 'true';
    this.taskNotificationTemplate = process.env.META_WHATSAPP_TASK_TEMPLATE || 'task_notification';
    this.statusUpdateTemplate = process.env.META_WHATSAPP_STATUS_TEMPLATE || 'task_status_update';
    this.templateLanguage = process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || null;

    // AiSensy provider instance (lazy)
    this._aisensy = null;
  }

  /**
   * Get the correct language code for a template from Meta API
   * @param {string} templateName - Name of the template
   * @returns {Promise<string>} Language code (e.g., 'en', 'en_US', 'en_GB')
   */
  async getTemplateLanguage(templateName) {
    try {
      if (!this.businessAccountId || !this.accessToken) {
        console.log('⚠️  Cannot fetch template language: Missing credentials, using default "en"');
        return 'en';
      }

      console.log(`🔍 Fetching template metadata for: ${templateName}`);
      
      const response = await axios.get(
        `${this.apiUrl}/${this.businessAccountId}/message_templates`,
        { 
          headers: { 
            Authorization: `Bearer ${this.accessToken}` 
          },
          params: {
            name: templateName // Filter by template name for efficiency
          }
        }
      );

      console.log(`📦 Templates API response:`, JSON.stringify(response.data, null, 2));

      const template = response.data.data.find(t => t.name === templateName);
      
      if (template) {
        console.log(`📋 Found template:`, JSON.stringify(template, null, 2));
        
        // Meta API returns language in different formats
        const languageCode = template.language || template.language_code || 'en';
        console.log(`✅ Auto-detected template language: ${languageCode} for template: ${templateName}`);
        return languageCode;
      }

      console.log(`⚠️  Template "${templateName}" not found in API response, using default "en"`);
      return 'en';

    } catch (error) {
      console.error('❌ Error fetching template language:', error.response?.data || error.message);
      console.log('⚠️  Falling back to default language: "en"');
      return 'en';
    }
  }

  /**
   * Format phone number to WhatsApp format
   * Meta WhatsApp expects: country code + phone number (e.g., 919418245371)
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} Formatted phone number with country code
   */
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Remove all non-numeric characters
    let formatted = phoneNumber.replace(/\D/g, '');
    
    // Remove leading 0 from Indian numbers (09418245371 -> 9418245371)
    if (formatted.startsWith('0') && formatted.length === 11) {
      formatted = formatted.substring(1);
    }
    
    // If 10 digits, add India country code (91)
    if (formatted.length === 10) {
      formatted = '91' + formatted;
    }
    
    // Handle case where number has 91 but with leading 0 (9109418245371)
    if (formatted.startsWith('910') && formatted.length === 13) {
      formatted = '91' + formatted.substring(3);
    }
    
    // Meta WhatsApp expects format: 919418245371 (country code + number, no +)
    console.log(`📱 Formatted phone: ${phoneNumber} → ${formatted}`);
    return formatted;
  }

  /**
   * Send task assignment notification via WhatsApp
   * @param {Object} params - Notification parameters
   * @param {string} params.phoneNumber - Recipient phone number
   * @param {string} params.userName - User's name
   * @param {string} params.taskTitle - Task title
   * @param {string} params.taskDescription - Task description
   * @param {string} params.priority - Task priority (low/medium/high)
   * @param {string} params.dueDate - Task due date
   * @param {string} params.businessName - Business/profile name
   * @param {string} params.taskId - Task ID for button URL parameter
   * @returns {Promise<Object>} API response
   */
  async sendTaskAssignmentNotification({
    phoneNumber,
    userName,
    taskTitle,
    taskDescription,
    priority,
    dueDate,
    businessName,
    taskId
  }) {
    try {
      // Validate required fields
      if (!phoneNumber) {
        console.log('❌ WhatsApp notification skipped: No phone number provided');
        return { success: false, error: 'No phone number' };
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        console.log('❌ WhatsApp notification skipped: Invalid phone number format');
        return { success: false, error: 'Invalid phone number' };
      }

      // Format priority emoji
      const priorityEmoji = {
        'high': '🔴',
        'medium': '🟡',
        'low': '🟢'
      }[priority?.toLowerCase()] || '⚪';

      // Format due date
      const dueDateText = dueDate ? `\n📅 *Due Date:* ${new Date(dueDate).toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      })}` : '';

      // Format business name
      const businessText = businessName ? `\n🏢 *Business:* ${businessName}` : '';

      // Create message text
      const messageText = `👋 Hi ${userName || 'there'}!

📋 *New Task Assigned*

${priorityEmoji} *${taskTitle}*${dueDateText}${businessText}

${taskDescription ? `📝 *Description:*\n${taskDescription}\n` : ''}
✅ Please complete this task as soon as possible.

_This is an automated message from Visibeen Task Management System._`;

      // Branch by provider
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📤 SENDING WHATSAPP MESSAGE`);
      console.log(`${'='.repeat(60)}`);
      console.log(`📱 To: ${formattedPhone}`);
      console.log(`👤 User: ${userName}`);
      console.log(`📋 Task: ${taskTitle}`);
      console.log(`🔌 Provider: ${this.provider}`);
      console.log(`${'='.repeat(60)}\n`);
      if (this.provider === 'aisensy') {
        if (!this._aisensy) this._aisensy = new AiSensyProvider();
        const templateId = process.env.AISENSY_TEMPLATE_ID_TASK;
        if (templateId) {
          const params = [userName || 'there', priorityEmoji, taskTitle, (dueDateText.replace('\n📅 *Due Date:* ', '') || 'Not set'), (businessName || 'N/A'), (taskDescription || 'No description')];
          const res = await this._aisensy.sendTemplate({ to: formattedPhone, templateId, parameters: params });
          return res;
        }
        // Fallback to text message
        const res = await this._aisensy.sendText({ to: formattedPhone, text: messageText });
        return res;
      } else {
        // Meta provider (existing logic)
        if (!this.phoneNumberId || !this.accessToken) {
          console.log('❌ WhatsApp notification skipped: Missing API credentials');
          return { success: false, error: 'Missing API credentials' };
        }

        let requestBody;
        if (this.useTemplates) {
          let languageCode;
          if (this.templateLanguage) {
            console.log(`🔧 Using manual language override: ${this.templateLanguage}`);
            languageCode = this.templateLanguage;
          } else {
            languageCode = await this.getTemplateLanguage(this.taskNotificationTemplate);
          }
          requestBody = {
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'template',
            template: {
              name: this.taskNotificationTemplate,
              language: { code: languageCode },
              components: [
                { type: 'body', parameters: [
                  { type: 'text', text: userName || 'there' },
                  { type: 'text', text: priorityEmoji },
                  { type: 'text', text: taskTitle },
                  { type: 'text', text: dueDateText.replace('\n📅 *Due Date:* ', '') || 'Not set' },
                  { type: 'text', text: businessName || 'N/A' },
                  { type: 'text', text: taskDescription || 'No description' }
                ]},
                { type: 'button', sub_type: 'url', index: '0', parameters: [ { type: 'text', text: taskId || '0' } ] }
              ]
            }
          };
        } else {
          requestBody = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhone,
            type: 'text',
            text: { preview_url: false, body: messageText }
          };
        }
        const response = await axios.post(
          `${this.apiUrl}/${this.phoneNumberId}/messages`,
          requestBody,
          { headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
        );
        return { success: true, messageId: response.data.messages?.[0]?.id, data: response.data };
      }

    } catch (error) {
      console.error('❌ Error sending WhatsApp notification:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  /**
   * Send task update notification via WhatsApp
   * @param {Object} params - Notification parameters
   * @param {string} params.phoneNumber - Recipient phone number
   * @param {string} params.userName - User's name
   * @param {string} params.taskTitle - Task title
   * @param {string} params.oldStatus - Previous task status
   * @param {string} params.newStatus - New task status
   * @param {string} params.businessName - Business/profile name
   * @returns {Promise<Object>} API response
   */
  async sendTaskUpdateNotification({
    phoneNumber,
    userName,
    taskTitle,
    oldStatus,
    newStatus,
    businessName
  }) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) return { success: false, error: 'Invalid phone number' };

      // Status emojis
      const statusEmoji = {
        'pending': '⏳',
        'in-progress': '🔄',
        'completed': '✅',
        'cancelled': '❌'
      };

      const businessText = businessName ? `\n🏢 *Business:* ${businessName}` : '';

      const messageText = `👋 Hi ${userName || 'there'}!

🔔 *Task Status Updated*

📋 *${taskTitle}*${businessText}

${statusEmoji[oldStatus] || '⚪'} Previous: ${oldStatus?.toUpperCase() || 'N/A'}
${statusEmoji[newStatus] || '⚪'} Current: ${newStatus?.toUpperCase() || 'N/A'}

_This is an automated message from Visibeen Task Management System._`;

      if (this.provider === 'aisensy') {
        if (!this._aisensy) this._aisensy = new AiSensyProvider();
        const templateId = process.env.AISENSY_TEMPLATE_ID_STATUS;
        if (templateId) {
          const params = [userName || 'there', taskTitle, (oldStatus || 'N/A'), (newStatus || 'N/A'), (businessName || 'N/A')];
          return await this._aisensy.sendTemplate({ to: formattedPhone, templateId, parameters: params });
        }
        return await this._aisensy.sendText({ to: formattedPhone, text: messageText });
      } else {
        const response = await axios.post(
          `${this.apiUrl}/${this.phoneNumberId}/messages`,
          { messaging_product: 'whatsapp', recipient_type: 'individual', to: formattedPhone, type: 'text', text: { preview_url: false, body: messageText } },
          { headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
        );
        return { success: true, messageId: response.data.messages?.[0]?.id, data: response.data };
      }

    } catch (error) {
      console.error('❌ Error sending WhatsApp update notification:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  /**
   * Send daily task reminder via WhatsApp
   * @param {Object} params - Notification parameters
   * @param {string} params.phoneNumber - Recipient phone number
   * @param {string} params.userName - User's name
   * @param {Array} params.tasks - Array of tasks for today
   * @returns {Promise<Object>} API response
   */
  async sendDailyTaskReminder({ phoneNumber, userName, tasks }) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone || !tasks || tasks.length === 0) return { success: false, error: 'Invalid phone number or no tasks' };

      // Format tasks list
      const tasksList = tasks.map((task, index) => {
        const priorityEmoji = {
          'high': '🔴',
          'medium': '🟡',
          'low': '🟢'
        }[task.priority?.toLowerCase()] || '⚪';
        
        return `${index + 1}. ${priorityEmoji} ${task.title}${task.businessName ? ` (${task.businessName})` : ''}`;
      }).join('\n');

      const messageText = `🌅 Good morning ${userName || 'there'}!

📋 *Your Tasks for Today*

${tasksList}

💪 Complete these tasks to stay on track!

_This is an automated message from Visibeen Task Management System._`;

      if (this.provider === 'aisensy') {
        if (!this._aisensy) this._aisensy = new AiSensyProvider();
        return await this._aisensy.sendText({ to: formattedPhone, text: messageText });
      } else {
        const response = await axios.post(
          `${this.apiUrl}/${this.phoneNumberId}/messages`,
          { messaging_product: 'whatsapp', recipient_type: 'individual', to: formattedPhone, type: 'text', text: { preview_url: false, body: messageText } },
          { headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
        );
        return { success: true, messageId: response.data.messages?.[0]?.id, data: response.data };
      }

    } catch (error) {
      console.error('❌ Error sending WhatsApp daily reminder:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }
}

module.exports = new WhatsAppService();
