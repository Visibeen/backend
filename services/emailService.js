const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.fromName = process.env.EMAIL_FROM_NAME || 'Visibeen Tasks';
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 'no-reply@visibeen.com';
  }

  getTransporter() {
    if (this.transporter) return this.transporter;

    // Prefer explicit SMTP settings; fall back to Gmail convenience if provided
    const smtpHost = process.env.SMTP_HOST || (process.env.GMAIL_USER ? 'smtp.gmail.com' : undefined);
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : (smtpHost === 'smtp.gmail.com' ? 465 : 587);
    const smtpSecure = (process.env.SMTP_SECURE || (smtpHost === 'smtp.gmail.com' ? 'true' : 'false')).toString() === 'true';

    const user = process.env.SMTP_USER || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

    // Required env vars:
    // - SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
    //   or
    // - GMAIL_USER, GMAIL_APP_PASSWORD (enable 2FA and create App Password)
    if (!smtpHost || !user || !pass) {
      throw new Error('EmailService: Missing SMTP configuration. Set SMTP_HOST, SMTP_USER, SMTP_PASS (or GMAIL_USER, GMAIL_APP_PASSWORD).');
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user, pass }
    });

    return this.transporter;
  }

  async sendMail({ to, subject, html, text }) {
    const transporter = this.getTransporter();
    const from = `${this.fromName} <${this.fromAddress}>`;

    const info = await transporter.sendMail({ from, to, subject, html, text });
    return { success: true, messageId: info.messageId, info };
  }

  async sendTaskAssignmentEmail({ to, userName, taskTitle, taskDescription, priority, dueDate, businessName, taskId }) {
    const subject = `New Task Assigned: ${taskTitle}`;
    const safeDescription = taskDescription || 'No description provided.';
    const safePriority = priority || 'medium';
    const safeBusiness = businessName || 'Your Business';
    const safeDue = dueDate ? new Date(dueDate).toLocaleDateString() : 'Not set';

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>Hi ${userName || 'there'},</p>
        <p><strong>New Task Assigned</strong></p>
        <p><strong>Title:</strong> ${taskTitle}</p>
        <p><strong>Business:</strong> ${safeBusiness}</p>
        <p><strong>Priority:</strong> ${safePriority}</p>
        <p><strong>Due Date:</strong> ${safeDue}</p>
        <p><strong>Description:</strong><br/>${safeDescription}</p>
        <p>Task ID: ${taskId || ''}</p>
        <p>— Visibeen Task Management</p>
      </div>
    `;

    const text = `New Task Assigned\nTitle: ${taskTitle}\nBusiness: ${safeBusiness}\nPriority: ${safePriority}\nDue: ${safeDue}\nDescription: ${safeDescription}\nTask ID: ${taskId || ''}`;

    return this.sendMail({ to, subject, html, text });
  }

  async sendTaskUpdateEmail({ to, userName, taskTitle, oldStatus, newStatus, businessName }) {
    const subject = `Task Updated: ${taskTitle} (${oldStatus} → ${newStatus})`;
    const safeBusiness = businessName || 'Your Business';

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>Hi ${userName || 'there'},</p>
        <p><strong>Task Status Updated</strong></p>
        <p><strong>Title:</strong> ${taskTitle}</p>
        <p><strong>Business:</strong> ${safeBusiness}</p>
        <p><strong>Status:</strong> ${oldStatus} → ${newStatus}</p>
        <p>— Visibeen Task Management</p>
      </div>
    `;

    const text = `Task Status Updated\nTitle: ${taskTitle}\nBusiness: ${safeBusiness}\nStatus: ${oldStatus} → ${newStatus}`;

    return this.sendMail({ to, subject, html, text });
  }
}

module.exports = new EmailService();


