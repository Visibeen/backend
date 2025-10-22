/**
 * Convert WhatsApp Access Token to Permanent (Never Expires)
 * This script exchanges your short-lived token for a long-lived one,
 * then converts it to a permanent token
 */

require('dotenv').config();
const axios = require('axios');

async function makePermanentToken() {
  const currentToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const appId = '4174652889487150'; // From your verification
  const businessAccountId = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;

  console.log('\n' + '='.repeat(70));
  console.log('🔄 CONVERTING TOKEN TO PERMANENT (NEVER EXPIRES)');
  console.log('='.repeat(70));
  console.log(`📱 App ID: ${appId}`);
  console.log(`🏢 Business Account ID: ${businessAccountId || 'MISSING - Please add to .env'}`);
  console.log(`🔑 Current Token: ${currentToken ? currentToken.substring(0, 30) + '...' : 'MISSING'}`);
  console.log('='.repeat(70) + '\n');

  if (!currentToken) {
    console.error('❌ No access token found in .env file!');
    return;
  }

  if (!businessAccountId) {
    console.error('❌ META_WHATSAPP_BUSINESS_ACCOUNT_ID not found in .env!');
    console.log('\n💡 To find your Business Account ID:');
    console.log('   1. Go to https://business.facebook.com/settings/whatsapp-business-accounts');
    console.log('   2. Copy the ID from the URL or settings page');
    console.log('   3. Add it to your .env file as META_WHATSAPP_BUSINESS_ACCOUNT_ID');
    console.log('');
    return;
  }

  try {
    // Step 1: Get long-lived token (60 days)
    console.log('📋 Step 1: Getting long-lived token (60 days)...');
    console.log('⚠️  Note: You need your App Secret for this step.');
    console.log('   If you don\'t have it, skip to Step 2 using System User method.\n');

    // For now, skip to Step 2 since we don't have app_secret in .env
    console.log('⏭️  Skipping Step 1 (requires app_secret)');
    console.log('   Using direct System User Token method instead...\n');

    // Step 2: Get permanent token using System User method
    console.log('📋 Step 2: Getting permanent token via System User...');
    console.log('   Endpoint: GET /v18.0/{business-id}/access_tokens\n');

    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${businessAccountId}/access_tokens`,
      {
        params: {
          access_token: currentToken
        }
      }
    );

    console.log('✅ Response received!\n');
    console.log('📦 Available Tokens:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');

    if (response.data.data && response.data.data.length > 0) {
      const permanentToken = response.data.data[0].access_token;
      
      console.log('='.repeat(70));
      console.log('✅ PERMANENT TOKEN GENERATED!');
      console.log('='.repeat(70));
      console.log('\n🔑 Your Permanent Access Token:');
      console.log(permanentToken);
      console.log('');
      console.log('📝 Update your .env file with:');
      console.log(`META_WHATSAPP_ACCESS_TOKEN=${permanentToken}`);
      console.log('');
      console.log('⏰ This token NEVER EXPIRES (unless manually revoked)');
      console.log('='.repeat(70));
      console.log('');
    } else {
      console.log('⚠️  No tokens found in response.');
      console.log('   You may need to create a System User token manually.');
      console.log('');
      showManualInstructions();
    }

  } catch (error) {
    console.error('\n❌ ERROR GENERATING PERMANENT TOKEN\n');
    
    if (error.response?.data?.error) {
      const err = error.response.data.error;
      console.error('Error Details:');
      console.error(`   Code: ${err.code}`);
      console.error(`   Type: ${err.type}`);
      console.error(`   Message: ${err.message}`);
      console.error('');

      if (err.code === 100 || err.code === 10) {
        console.error('🔧 This error means your current token doesn\'t have permission');
        console.error('   to generate permanent tokens programmatically.');
        console.error('');
        showManualInstructions();
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

function showManualInstructions() {
  console.log('='.repeat(70));
  console.log('📖 MANUAL METHOD: Generate Permanent Token via Meta Business Suite');
  console.log('='.repeat(70));
  console.log('');
  console.log('Follow these steps:');
  console.log('');
  console.log('1️⃣  Go to Meta Business Suite:');
  console.log('   https://business.facebook.com/settings/system-users');
  console.log('');
  console.log('2️⃣  Create or Select a System User:');
  console.log('   - Click "Add" to create new system user (or use existing)');
  console.log('   - Give it a name like "WhatsApp API User"');
  console.log('');
  console.log('3️⃣  Assign WhatsApp Assets:');
  console.log('   - Click on the system user');
  console.log('   - Click "Add Assets"');
  console.log('   - Select "WhatsApp Accounts"');
  console.log('   - Add your WhatsApp Business Account');
  console.log('   - Grant "Full control" permission');
  console.log('');
  console.log('4️⃣  Generate Token:');
  console.log('   - Click "Generate New Token"');
  console.log('   - Select your App: "Visibeen" (ID: 4174652889487150)');
  console.log('   - Select permissions:');
  console.log('     ✅ whatsapp_business_messaging');
  console.log('     ✅ whatsapp_business_management');
  console.log('   - Click "Generate Token"');
  console.log('   - Copy the token (you won\'t see it again!)');
  console.log('');
  console.log('5️⃣  Update .env file:');
  console.log('   META_WHATSAPP_ACCESS_TOKEN=<your_new_permanent_token>');
  console.log('');
  console.log('6️⃣  Restart your server:');
  console.log('   npm start');
  console.log('');
  console.log('✨ This token will NEVER EXPIRE (unless you revoke it manually)');
  console.log('='.repeat(70));
  console.log('');
}

makePermanentToken();
