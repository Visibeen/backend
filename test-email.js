/**
 * ZeptoMail Email Test Script
 * Run this to verify ZeptoMail integration is working correctly
 * 
 * Usage: node test-email.js
 */

require('dotenv').config();
const emailService = require('./services/emailService');

const testEmail = async () => {
  try {
    console.log('\n==============================================');
    console.log('📧 ZEPTOMAIL EMAIL INTEGRATION TEST');
    console.log('==============================================\n');
    
    console.log('Configuration:');
    console.log('  SMTP Host:', process.env.SMTP_HOST || 'smtp.zeptomail.in');
    console.log('  SMTP Port:', process.env.SMTP_PORT || '587');
    console.log('  SMTP User:', process.env.SMTP_USER || 'emailapikey');
    console.log('  From Address:', process.env.EMAIL_FROM_ADDRESS || 'noreply@visibeen.com');
    console.log('  API Key Set:', process.env.ZEPTOMAIL_API_KEY ? '✅ Yes' : '❌ No');
    console.log('\n----------------------------------------------\n');
    
    if (!process.env.ZEPTOMAIL_API_KEY && !process.env.SMTP_PASS) {
      console.error('❌ ERROR: ZEPTOMAIL_API_KEY or SMTP_PASS not found in .env file');
      console.error('\nPlease add one of the following to your .env file:');
      console.error('  ZEPTOMAIL_API_KEY=your_api_key');
      console.error('  OR');
      console.error('  SMTP_PASS=your_api_key');
      process.exit(1);
    }
    
    const testRecipient = process.argv[2] || 'e2ebackupchd@gmail.com';
    
    console.log(`📤 Sending test email to: ${testRecipient}\n`);
    
    // Send test task assignment email
    await emailService.sendTaskAssignmentEmail({
      to: testRecipient,
      userName: 'Test User',
      taskTitle: 'ZeptoMail Integration Test',
      taskDescription: 'This is a test email to verify that ZeptoMail is configured correctly and can send task reminder emails. If you receive this email, the integration is working perfectly!',
      priority: 'high',
      dueDate: new Date(),
      businessName: 'Visibeen Test Business',
      taskId: '999'
    });
    
    console.log('✅ TEST EMAIL SENT SUCCESSFULLY!\n');
    console.log('Next steps:');
    console.log('  1. Check your inbox at:', testRecipient);
    console.log('  2. Check spam/junk folder if not in inbox');
    console.log('  3. Verify ZeptoMail dashboard for delivery status:');
    console.log('     https://www.zoho.com/zeptomail/\n');
    console.log('==============================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n==============================================');
    console.error('❌ EMAIL TEST FAILED');
    console.error('==============================================\n');
    console.error('Error:', error.message);
    console.error('\nCommon issues:');
    console.error('  1. Invalid or expired API key');
    console.error('  2. Network connectivity issues');
    console.error('  3. Incorrect SMTP configuration');
    console.error('  4. ZeptoMail service down\n');
    console.error('Full error details:');
    console.error(error);
    console.error('\n==============================================\n');
    process.exit(1);
  }
};

// Run the test
testEmail();

