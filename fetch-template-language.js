/**
 * Fetch WhatsApp Template Language Code
 * This script fetches the actual language code from Meta's API
 */

require('dotenv').config();
const axios = require('axios');

async function fetchTemplateLanguage() {
  const businessAccountId = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID || '817290054154791';
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.META_WHATSAPP_TASK_TEMPLATE || 'task_notification_v2';
  const apiUrl = process.env.META_WHATSAPP_API_URL || 'https://graph.facebook.com/v22.0';

  console.log('\n' + '='.repeat(70));
  console.log('🔍 FETCHING WHATSAPP TEMPLATE METADATA');
  console.log('='.repeat(70));
  console.log(`📋 Template Name: ${templateName}`);
  console.log(`🏢 Business Account ID: ${businessAccountId}`);
  console.log(`🔑 Token: ${accessToken ? accessToken.substring(0, 20) + '...' : 'MISSING'}`);
  console.log(`🔗 API URL: ${apiUrl}/${businessAccountId}/message_templates`);
  console.log('='.repeat(70) + '\n');

  if (!businessAccountId || !accessToken) {
    console.error('❌ Missing credentials! Check your .env file.');
    console.log('\nRequired in .env:');
    console.log('META_WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id');
    console.log('META_WHATSAPP_ACCESS_TOKEN=your_access_token');
    return;
  }

  try {
    console.log('📤 Fetching all templates from Meta API...\n');

    const response = await axios.get(
      `${apiUrl}/${businessAccountId}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          fields: 'name,language,status,category,components'
        }
      }
    );

    console.log('✅ API Response received!\n');
    console.log('📦 Full Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n' + '='.repeat(70));

    // Find the specific template
    const templates = response.data.data || [];
    const targetTemplate = templates.find(t => t.name === templateName);

    if (targetTemplate) {
      console.log(`\n✅ FOUND TEMPLATE: ${templateName}`);
      console.log('='.repeat(70));
      console.log('📋 Template Details:');
      console.log(JSON.stringify(targetTemplate, null, 2));
      console.log('\n' + '='.repeat(70));
      console.log(`🌐 LANGUAGE CODE: ${targetTemplate.language}`);
      console.log('='.repeat(70));
      console.log('\n💡 Add this to your .env file:');
      console.log(`META_WHATSAPP_TEMPLATE_LANGUAGE=${targetTemplate.language}`);
      console.log('\n');
    } else {
      console.log(`\n⚠️  Template "${templateName}" not found!`);
      console.log('\n📋 Available templates:');
      templates.forEach(t => {
        console.log(`   - ${t.name} (Language: ${t.language}, Status: ${t.status})`);
      });
    }

  } catch (error) {
    console.error('\n❌ ERROR fetching templates:');
    console.error('='.repeat(70));
    
    if (error.response?.data) {
      console.error('Error Details:', JSON.stringify(error.response.data, null, 2));
      
      const errorMsg = error.response.data.error?.message;
      const errorCode = error.response.data.error?.code;
      
      console.error('\n🔍 Troubleshooting:');
      
      if (errorMsg?.includes('token') || errorCode === 190) {
        console.error('❌ Access token issue:');
        console.error('   - Token expired or invalid');
        console.error('   - Generate new token in Meta dashboard');
        console.error('   - Go to: https://developers.facebook.com/apps/');
      } else if (errorMsg?.includes('business account')) {
        console.error('❌ Business Account ID issue:');
        console.error('   - Check META_WHATSAPP_BUSINESS_ACCOUNT_ID in .env');
        console.error('   - Find it at: https://business.facebook.com/settings/whatsapp-business-accounts/');
      } else {
        console.error('❌ Unknown error - check error details above');
      }
    } else {
      console.error('Error:', error.message);
    }
    
    console.error('='.repeat(70) + '\n');
  }
}

// Run the script
fetchTemplateLanguage();
