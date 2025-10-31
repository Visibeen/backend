/**
 * AiSensy WhatsApp Provider
 * @description Minimal wrapper around AiSensy HTTP APIs.
 * NOTE: Configure the following env vars in your deployment:
 *  - AISENSY_API_URL (e.g., https://backend.api.aisensy.com)
 *  - AISENSY_API_KEY (Bearer/API key provided by AiSensy)
 *  - AISENSY_SEND_URL_TEXT (optional full URL for text/session messages)
 *  - AISENSY_SEND_URL_TEMPLATE (optional full URL for template messages)
 *  - AISENSY_CAMPAIGN_NAME (optional campaign tag/name)
 *  - AISENSY_TEMPLATE_ID_TASK (template id/name for task assignment)
 *  - AISENSY_TEMPLATE_ID_STATUS (template id/name for task status updates)
 */

const axios = require('axios');

class AiSensyProvider {
  constructor() {
    this.baseUrl = process.env.AISENSY_API_URL || 'https://backend.api.aisensy.com';
    this.apiKey = process.env.AISENSY_API_KEY || '';
    this.sendUrlText = process.env.AISENSY_SEND_URL_TEXT || `${this.baseUrl}/campaign/t1/api/v2/send`; // fallback
    this.sendUrlTemplate = process.env.AISENSY_SEND_URL_TEMPLATE || `${this.baseUrl}/campaign/t1/api/v2/send`; // fallback
    this.campaignName = process.env.AISENSY_CAMPAIGN_NAME || 'Visibeen Tasks';
    this.templateIdTask = process.env.AISENSY_TEMPLATE_ID_TASK || '';
    this.templateIdStatus = process.env.AISENSY_TEMPLATE_ID_STATUS || '';
  }

  // Normalize phone to E.164 without plus by default (e.g., 91xxxxxxxxxx)
  normalizePhone(phoneNumber) {
    if (!phoneNumber) return null;
    let digits = String(phoneNumber).replace(/\D/g, '');
    if (digits.length === 10) digits = '91' + digits; // default to India
    if (digits.startsWith('0') && digits.length === 11) digits = digits.substring(1);
    if (digits.startsWith('910') && digits.length === 13) digits = '91' + digits.substring(3);
    return digits;
  }

  /**
   * Send a free-form text (session) message
   */
  async sendText({ to, text }) {
    const destination = this.normalizePhone(to);
    if (!destination) return { success: false, error: 'Invalid phone' };

    try {
      const payload = {
        to: destination,
        messageType: 'TEXT',
        text: text,
        campaignName: this.campaignName
      };

      const res = await axios.post(this.sendUrlText, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  /**
   * Send a template message
   */
  async sendTemplate({ to, templateId, parameters = [] }) {
    const destination = this.normalizePhone(to);
    if (!destination) return { success: false, error: 'Invalid phone' };

    try {
      const payload = {
        to: destination,
        messageType: 'TEMPLATE',
        templateId: templateId,
        templateParams: parameters,
        campaignName: this.campaignName
      };

      const res = await axios.post(this.sendUrlTemplate, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }
}

module.exports = AiSensyProvider;


