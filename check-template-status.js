/**
 * Check WhatsApp Template Status
 * This checks if your templates are approved and ready to use
 */

require('dotenv').config();
const axios = require('axios');

async function checkTemplateStatus() {
  const apiUrl = process.env.META_WHATSAPP_API_URL || 'https://graph.facebook.com/v22.0';
  const businessAccountId = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;

  console.log('\n' + '='.repeat(60));
  console.log('📋 CHECKING WHATSAPP TEMPLATE STATUS');
  console.log('='.repeat(60));
  console.log(`🔑 Business Account ID: ${businessAccountId || 'MISSING'}`);
  console.log('='.repeat(60) + '\n');

  if (!businessAccountId || !accessToken) {
    console.error('❌ Missing credentials! Check your .env file.');
    console.log('\nRequired in .env:');
    console.log('META_WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id');
    console.log('META_WHATSAPP_ACCESS_TOKEN=your_access_token');
    return;
  }

  try {
    console.log('📤 Fetching templates...\n');

    const response = await axios.get(
      `${apiUrl}/${businessAccountId}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const templates = response.data.data;

    if (templates.length === 0) {
      console.log('⚠️  No templates found.');
      console.log('Create templates at: https://business.facebook.com/wa/manage/message-templates/\n');
      return;
    }

    console.log(`✅ Found ${templates.length} template(s):\n`);
    console.log('='.repeat(60));

    templates.forEach((template, index) => {
      console.log(`\n${index + 1}. Template: ${template.name}`);
      console.log(`   Status: ${template.status}`);
      console.log(`   Category: ${template.category}`);
      console.log(`   Language: ${template.language}`);
      
      if (template.status === 'APPROVED') {
        console.log(`   ✅ Ready to use!`);
      } else if (template.status === 'PENDING') {
        console.log(`   ⏳ Waiting for approval...`);
      } else if (template.status === 'REJECTED') {
        console.log(`   ❌ Rejected - check rejection reason in Meta dashboard`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Templates in your .env:');
    console.log(`   TASK_TEMPLATE: ${process.env.META_WHATSAPP_TASK_TEMPLATE || 'NOT SET'}`);
    console.log(`   STATUS_TEMPLATE: ${process.env.META_WHATSAPP_STATUS_TEMPLATE || 'NOT SET'}`);

    // Check if configured templates exist
    const taskTemplate = process.env.META_WHATSAPP_TASK_TEMPLATE;
    const statusTemplate = process.env.META_WHATSAPP_STATUS_TEMPLATE;

    console.log('\n🔍 Verification:');
    
    if (taskTemplate) {
      const found = templates.find(t => t.name === taskTemplate);
      if (found) {
        if (found.status === 'APPROVED') {
          console.log(`   ✅ Task template "${taskTemplate}" is APPROVED and ready!`);
        } else {
          console.log(`   ⚠️  Task template "${taskTemplate}" exists but status: ${found.status}`);
        }
      } else {
        console.log(`   ❌ Task template "${taskTemplate}" NOT FOUND`);
        console.log(`      Available templates: ${templates.map(t => t.name).join(', ')}`);
      }
    } else {
      console.log(`   ⚠️  META_WHATSAPP_TASK_TEMPLATE not set in .env`);
    }

    if (statusTemplate && statusTemplate !== taskTemplate) {
      const found = templates.find(t => t.name === statusTemplate);
      if (found) {
        if (found.status === 'APPROVED') {
          console.log(`   ✅ Status template "${statusTemplate}" is APPROVED and ready!`);
        } else {
          console.log(`   ⚠️  Status template "${statusTemplate}" exists but status: ${found.status}`);
        }
      } else {
        console.log(`   ❌ Status template "${statusTemplate}" NOT FOUND`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n💡 Next Steps:');
    
    const approvedTemplates = templates.filter(t => t.status === 'APPROVED');
    const pendingTemplates = templates.filter(t => t.status === 'PENDING');
    
    if (pendingTemplates.length > 0) {
      console.log(`   ⏳ Wait for ${pendingTemplates.length} template(s) to be approved`);
      console.log(`   📋 Check status: https://business.facebook.com/wa/manage/message-templates/`);
    }
    
    if (approvedTemplates.length > 0) {
      console.log(`   ✅ ${approvedTemplates.length} template(s) ready to use`);
      console.log(`   📝 Update .env with approved template names`);
      console.log(`   🔄 Restart server after updating .env`);
    }
    
    console.log('\n');

  } catch (error) {
    console.error('\n❌ ERROR fetching templates:');
    console.error('='.repeat(60));
    
    if (error.response?.data) {
      console.error('Error Details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    console.error('='.repeat(60) + '\n');
  }
}

// Run check
checkTemplateStatus();
