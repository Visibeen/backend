const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.fromName = process.env.EMAIL_FROM_NAME || 'Visibeen';
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@visibeen.com';
  }

  getTransporter() {
    if (this.transporter) return this.transporter;

    // Use ZeptoMail configuration
    const smtpHost = process.env.SMTP_HOST || 'smtp.zeptomail.in';
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpSecure = (process.env.SMTP_SECURE || 'false').toString() === 'true'; // ZeptoMail uses STARTTLS (port 587)

    const user = process.env.SMTP_USER || 'emailapikey';
    const pass = process.env.SMTP_PASS || process.env.ZEPTOMAIL_API_KEY;

    // Required env vars:
    // - SMTP_HOST (default: smtp.zeptomail.in)
    // - SMTP_PORT (default: 587)
    // - SMTP_USER (default: emailapikey)
    // - SMTP_PASS or ZEPTOMAIL_API_KEY (your ZeptoMail API token)
    if (!smtpHost || !user || !pass) {
      throw new Error('EmailService: Missing ZeptoMail SMTP configuration. Set SMTP_PASS or ZEPTOMAIL_API_KEY.');
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user, pass }
    });

    console.log(`✉️ EmailService initialized with ZeptoMail (${smtpHost}:${smtpPort})`);

    return this.transporter;
  }

  async sendMail({ to, subject, html, text }) {
    const transporter = this.getTransporter();
    const from = `${this.fromName} <${this.fromAddress}>`;

    const info = await transporter.sendMail({ from, to, subject, html, text });
    return { success: true, messageId: info.messageId, info };
  }

  async sendTaskAssignmentEmail({ to, userName, taskTitle, taskDescription, priority, dueDate, businessName, taskId }) {
    const subject = `Task Reminder: ${taskTitle}`;
    const safeDescription = taskDescription || 'No description provided.';
    const safePriority = priority || 'medium';
    const safeBusiness = businessName || 'Your Business';
    const safeDue = dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : 'Not set';
    const safeTaskId = taskId || 'N/A';
    
    // Task management page URL with taskId parameter to auto-open the task
    const taskUrl = taskId 
      ? `https://www.visibeen.com/task-management?taskId=${taskId}`
      : `https://www.visibeen.com/task-management`;

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Task Reminder</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif; -webkit-font-smoothing:antialiased;">
  <center style="width:100%; background-color:#f4f6f8;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="padding:30px 10px;">
          <!-- Container -->
          <table width="600" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            
            <!-- Header with Logo -->
            <tr>
              <td style="padding: 20px; text-align:center;">
                <img src="https://app.visibeen.in/static/media/visibeenlogo.1c939c6e6a5b78ff8ff2.png" alt="Visibeen logo" width="200" height="auto" style="display:block; margin:0 auto; border:0; outline:none; text-decoration:none;">
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:8px;">
                <!-- Reminder Icon -->
                <p style="text-align:center; margin:0;">
                  <img src="https://cdn-icons-png.flaticon.com/512/3652/3652191.png" alt="Reminder" width="160" height="160" style="display:block; margin:0 auto; border:0; outline:none; text-decoration:none;">
                </p>
                
                <h1 style="margin: 20px 0 2px 0; font-size:20px; color:#111; font-weight:700; text-align: center;">Task Reminder</h1>
                
                <p style="margin:20px 0 16px 0; color:#444; line-height:1.5; text-align: center; padding: 0 20px;">
                  Hi ${userName || 'there'}, This is a friendly reminder that you have a pending task waiting for you in Visibeen. Staying on top of your tasks helps you stay productive and achieve your goals faster.
                </p>

                <!-- Task Details Section -->
                <div>
                  <h3 style="margin: 40px 0 8px 0; font-size:16px; color:#111; text-align: center;">Task Details:</h3>
                  
                  <table width="100%" cellpadding="12" cellspacing="0" border="0" style="max-width:500px; margin: 20px auto; border-collapse:separate; border-spacing:0; font-family:Arial, sans-serif; font-size:14px; color:#333; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                    
                    <tr style="background:#ffffff;">
                      <td style="font-weight:bold; text-align:left; padding:12px;">Task ID:</td>
                      <td style="text-align:left; padding:12px;">#${safeTaskId}</td>
                    </tr>
                    
                    <tr style="background:#f9fbfd;">
                      <td style="font-weight:bold; text-align:left; padding:12px;">Task Name:</td>
                      <td style="text-align:left; padding:12px;">${taskTitle}</td>
                    </tr>
                    
                    <tr style="background:#ffffff;">
                      <td style="font-weight:bold; text-align:left; padding:12px;">Due Date:</td>
                      <td style="text-align:left; padding:12px;">${safeDue}</td>
                    </tr>
                    
                    <tr style="background:#f9fbfd;">
                      <td style="font-weight:bold; text-align:left; padding:12px;">Priority:</td>
                      <td style="text-align:left; padding:12px;">${safePriority.charAt(0).toUpperCase() + safePriority.slice(1)}</td>
                    </tr>

                    <tr style="background:#ffffff;">
                      <td style="font-weight:bold; text-align:left; padding:12px;">Business:</td>
                      <td style="text-align:left; padding:12px;">${safeBusiness}</td>
                    </tr>

                    <tr style="background:#f9fbfd;">
                      <td style="font-weight:bold; text-align:left; padding:12px; vertical-align:top;">Description:</td>
                      <td style="text-align:left; padding:12px;">${safeDescription}</td>
                    </tr>
                  </table>

                  <p style="margin:0 0 16px 0; color:#444; line-height:1.5; text-align: center; padding: 0 20px;">
                    Don't let your progress slow down—log in now and complete your task today.
                  </p>
                  
                  <!-- CTA Button -->
                  <p style="margin:20px; text-align:center;">
                    <a href="${taskUrl}" style="display:inline-block; padding:12px 24px; background:#0B91D6; color:#fff; border-radius:6px; text-decoration:none; font-weight:600;">
                      Complete Now
                    </a>
                  </p>
                </div>

                <!-- Footer Section -->
                <tr>
                  <td align="center" style="padding:20px; background:#f0f8ff; font-family:Arial, sans-serif; font-size:14px; color:#000;">
                    
                    <!-- Contact Info -->
                    <p style="margin: 20px 0; font-weight:600; color: #000;">Get in touch</p>
                    <p style="margin:5px 0 15px 0;">
                      <a href="mailto:support@visibeen.in" style="color:#0B91D6; text-decoration:none;">
                        support@visibeen.in
                      </a>
                    </p>
                    
                    <!-- Social Icons -->
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
                      <tr>
                        <td style="padding:0 8px;">
                          <a href="https://www.facebook.com/profile.php?id=61566867428338" target="_blank">
                            <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" width="32" height="32" style="display:block; border:0;">
                          </a>
                        </td>
                        <td style="padding:0 8px;">
                          <a href="https://www.instagram.com/visibeenbye2edigitechpvt?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank">
                            <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" width="32" height="32" style="display:block; border:0;">
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Copyright -->
                    <p style="margin: 26px 0 0 0; font-size:12px; color: #000;">
                      Copyrights © Visibeen All Rights Reserved
                    </p>
                    
                    <!-- Footer Links -->
                    <div style="border-top: 1px solid #ccc; padding-top: 10px; margin-top: 20px;">
                      <div style="margin-bottom: 20px;">
                        <a href="https://app.visibeen.in/dashboard" style="margin-right: 15px; color: #333; text-decoration: none;">My account</a>
                        <a href="https://app.visibeen.in/terms" style="margin-right: 15px; color: #333; text-decoration: none;">Terms of use</a>
                        <a href="https://app.visibeen.in/privacy" style="margin-right: 15px; color: #333; text-decoration: none;">Privacy policy</a>
                        <a href="mailto:support@visibeen.in" style="color: #333; text-decoration: none;">Support</a>
                      </div>
                    </div>
                  </td>
                </tr>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
    `;

    const text = `Task Reminder\n\nHi ${userName || 'there'},\n\nThis is a friendly reminder that you have a pending task waiting for you in Visibeen.\n\nTask Details:\nTask ID: #${safeTaskId}\nTask Name: ${taskTitle}\nDue Date: ${safeDue}\nPriority: ${safePriority}\nBusiness: ${safeBusiness}\nDescription: ${safeDescription}\n\nComplete your task: ${taskUrl}\n\n— Visibeen Task Management`;

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

  async sendWelcomeEmail({ to, userName }) {
    const subject = 'Welcome to Visibeen - Let\'s Get Started!';
    const safeUserName = userName || 'there';

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Welcome to Visibeen</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif; -webkit-font-smoothing:antialiased;">
  <center style="width:100%; background-color:#f4f6f8;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td style="padding:30px 10px;">
          <!-- Container -->
          <table width="600" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            
            <!-- Header with Logo -->
            <tr>
              <td style="padding: 20px; text-align:center;">
                <img src="https://app.visibeen.in/static/media/visibeenlogo.1c939c6e6a5b78ff8ff2.png" alt="Visibeen logo" width="200" height="auto" style="display:block; margin:0 auto; border:0; outline:none; text-decoration:none;">
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px 0; font-size:20px; color:#111; font-weight:700; text-align: center;">Welcome to Visibeen</h1>
                <p style="margin:0 0 16px 0; color:#444; line-height:1.5; text-align: center;">
                  Hi ${safeUserName}, We're excited to have you on board with Visibeen!
                </p>

                <!-- Dashboard Section -->
                <div>
                  <p style="text-align:center; margin:0;">
                    <img src="https://cdn-icons-png.flaticon.com/512/2920/2920277.png" alt="Dashboard" width="160" height="160" style="display:block; margin: 40px auto; border:0; outline:none; text-decoration:none;">
                  </p>
                  <h3 style="margin:18px 0 8px 0; font-size:16px; color:#111; text-align: center;">Stay in Control</h3>
                  <p style="margin:0 0 16px 0; color:#555; line-height:1.5; text-align: center; padding: 0 20px;">
                    From keyword research to backlink audits, manage every aspect of your SEO workflow with clarity and confidence.
                  </p>
                  <p style="margin: 40px; text-align:center;">
                    <a href="https://www.visibeen.com/dashboard" style="display:inline-block; padding:12px 24px; text-decoration:none; border-radius:6px; background:#0B91D6; color:#fff; font-weight:600;">
                      Check Dashboard
                    </a>
                  </p>
                </div>

                <!-- Task Management Section -->
                <div>
                  <p style="text-align:center; margin:0;">
                    <img src="https://cdn-icons-png.flaticon.com/512/2956/2956780.png" alt="Task Management" width="160" height="160" style="display:block; margin:40px auto; border:0; outline:none; text-decoration:none;">
                  </p>
                  <h3 style="margin:18px 0 8px 0; font-size:16px; color:#111; text-align: center;">Stay on Top of Every Task</h3>
                  <p style="margin:0 0 16px 0; color:#555; line-height:1.5; text-align: center; padding: 0 20px;">
                    With Visibeen's task management tools, you can organize, assign, and track progress seamlessly—so projects stay on schedule and nothing slips through the cracks.
                  </p>
                  <p style="margin: 40px; text-align:center;">
                    <a href="https://www.visibeen.com/task-management" style="display:inline-block; padding:12px 24px; text-decoration:none; border-radius:6px; background:#0B91D6; color:#fff; font-weight:600;">
                      Complete Task
                    </a>
                  </p>
                </div>

                <!-- Free Website Section -->
                <div>
                  <p style="text-align:center; margin:0;">
                    <img src="https://cdn-icons-png.flaticon.com/512/3281/3281289.png" alt="Free Website" width="160" height="160" style="display:block; margin: 40px auto; border:0; outline:none; text-decoration:none;">
                  </p>
                  <h3 style="margin:18px 0 8px 0; font-size:16px; color:#111; text-align: center;">Get Your Free Website Today</h3>
                  <p style="margin:0 0 16px 0; color:#555; line-height:1.5; text-align: center; padding: 0 20px;">
                    With Visibeen's free website builder, you can launch a professional online presence in minutes—no coding needed, just simple tools to grow your brand online.
                  </p>
                  <p style="margin: 40px; text-align:center;">
                    <a href="https://www.visibeen.com/free-website" style="display:inline-block; padding:12px 24px; text-decoration:none; border-radius:6px; background:#0B91D6; color:#fff; font-weight:600;">
                      Claim Now
                    </a>
                  </p>
                </div>

                <!-- Footer Section -->
                <tr>
                  <td align="center" style="padding:20px; background:#f0f8ff; font-family:Arial, sans-serif; font-size:14px; color:#000;">
                    <!-- Contact Info -->
                    <p style="margin: 20px 0; font-weight:600; color: #000;">Get in touch</p>
                    <p style="margin:5px 0 15px 0;">
                      <a href="mailto:support@visibeen.in" style="color:#0B91D6; text-decoration:none;">
                        support@visibeen.in
                      </a>
                    </p>
                    
                    <!-- Social Icons -->
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
                      <tr>
                        <td style="padding:0 8px;">
                          <a href="https://www.facebook.com/profile.php?id=61566867428338" target="_blank">
                            <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" width="32" height="32" style="display:block; border:0;">
                          </a>
                        </td>
                        <td style="padding:0 8px;">
                          <a href="https://www.instagram.com/visibeenbye2edigitechpvt?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank">
                            <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" width="32" height="32" style="display:block; border:0;">
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Copyright -->
                    <p style="margin: 26px 0 0 0; font-size:12px; color: #000;">
                      Copyrights © Visibeen All Rights Reserved
                    </p>
                    
                    <!-- Footer Links -->
                    <div style="border-top: 1px solid #ccc; padding-top: 10px; margin-top: 20px;">
                      <div style="margin-bottom: 20px;">
                        <a href="https://www.visibeen.com/dashboard" style="margin-right: 15px; color: #333; text-decoration: none;">My account</a>
                        <a href="https://www.visibeen.com/terms" style="margin-right: 15px; color: #333; text-decoration: none;">Terms of use</a>
                        <a href="https://www.visibeen.com/privacy" style="margin-right: 15px; color: #333; text-decoration: none;">Privacy policy</a>
                        <a href="mailto:support@visibeen.in" style="color: #333; text-decoration: none;">Support</a>
                      </div>
                    </div>
                  </td>
                </tr>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
    `;

    const text = `Welcome to Visibeen!\n\nHi ${safeUserName},\n\nWe're excited to have you on board with Visibeen!\n\nStay in Control:\nFrom keyword research to backlink audits, manage every aspect of your SEO workflow with clarity and confidence.\nCheck Dashboard: https://www.visibeen.com/dashboard\n\nStay on Top of Every Task:\nWith Visibeen's task management tools, you can organize, assign, and track progress seamlessly.\nComplete Task: https://www.visibeen.com/task-management\n\nGet Your Free Website Today:\nWith Visibeen's free website builder, you can launch a professional online presence in minutes.\nClaim Now: https://www.visibeen.com/free-website\n\nGet in touch: support@visibeen.in\n\n— Visibeen Team`;

    return this.sendMail({ to, subject, html, text });
  }
}

module.exports = new EmailService();


