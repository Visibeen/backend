/**
 * Verify WhatsApp Access Token
 * Tests if your access token has the correct permissions
 */

require('dotenv').config();
const axios = require('axios');

async function verifyToken() {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const apiUrl = process.env.META_WHATSAPP_API_URL || 'https://graph.facebook.com/v22.0';

  console.log('\n' + '='.repeat(60));
  console.log('🔍 VERIFYING WHATSAPP ACCESS TOKEN');
  console.log('='.repeat(60));
  console.log(`🔑 Token: ${accessToken ? accessToken.substring(0, 30) + '...' : 'MISSING'}`);
  console.log(`📞 Phone ID: ${phoneNumberId || 'MISSING'}`);
  console.log('='.repeat(60) + '\n');

  if (!accessToken || !phoneNumberId) {
    console.error('❌ Missing credentials! Check your .env file.');
    return;
  }

  try {
    // Test 1: Get phone number details
    console.log('📋 Test 1: Fetching phone number details...');
    const phoneResponse = await axios.get(
      `${apiUrl}/${phoneNumberId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          fields: 'verified_name,display_phone_number,quality_rating'
        }
      }
    );

    console.log('✅ Phone Number Details:');
    console.log(JSON.stringify(phoneResponse.data, null, 2));
    console.log('');

    // Test 2: Check permissions
    console.log('📋 Test 2: Checking token permissions...');
    const debugResponse = await axios.get(
      'https://graph.facebook.com/debug_token',
      {
        params: {
          input_token: accessToken,
          access_token: accessToken
        }
      }
    );

    console.log('✅ Token Info:');
    console.log(`   App ID: ${debugResponse.data.data.app_id}`);
    console.log(`   Valid: ${debugResponse.data.data.is_valid}`);
    console.log(`   Expires: ${debugResponse.data.data.expires_at === 0 ? 'Never (Permanent)' : new Date(debugResponse.data.data.expires_at * 1000)}`);
    console.log(`   Scopes: ${debugResponse.data.data.scopes?.join(', ') || 'None'}`);
    console.log('');

    // Test 3: Try to send a test message (using hello_world template)
    console.log('📋 Test 3: Testing message sending capability...');
    console.log('   (This will attempt to send a hello_world template message)');
    
    const testPhone = '919418245371'; // Your test number
    
    try {
      const messageResponse = await axios.post(
        `${apiUrl}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: testPhone,
          type: 'template',
          template: {
            name: 'hello_world',
            language: {
              code: 'en_US'
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Message Sending Test: SUCCESS');
      console.log(`   Message ID: ${messageResponse.data.messages[0].id}`);
      console.log('');
    } catch (msgError) {
      console.log('❌ Message Sending Test: FAILED');
      console.log(`   Error: ${msgError.response?.data?.error?.message || msgError.message}`);
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('✅ TOKEN VERIFICATION COMPLETE');
    console.log('='.repeat(60));
    console.log('\n💡 If all tests passed, your token is working correctly!');
    console.log('💡 If message sending failed, check your permissions.');
    console.log('');

  } catch (error) {
    console.error('\n❌ TOKEN VERIFICATION FAILED\n');
    
    if (error.response?.data?.error) {
      const err = error.response.data.error;
      console.error('Error Details:');
      console.error(`   Code: ${err.code}`);
      console.error(`   Type: ${err.type}`);
      console.error(`   Message: ${err.message}`);
      console.error('');
      
      // Provide specific guidance based on error code
      if (err.code === 10) {
        console.error('🔧 FIX: Permission Error (Code 10)');
        console.error('   Your token does not have the required permissions.');
        console.error('   Solution:');
        console.error('   1. Go to Meta Business Suite → System Users');
        console.error('   2. Generate a new token with these permissions:');
        console.error('      - whatsapp_business_messaging');
        console.error('      - whatsapp_business_management');
        console.error('   3. Update META_WHATSAPP_ACCESS_TOKEN in .env');
        console.error('');
      } else if (err.code === 190) {
        console.error('🔧 FIX: Invalid Token (Code 190)');
        console.error('   Your token is invalid or expired.');
        console.error('   Solution:');
        console.error('   1. Generate a new permanent access token');
        console.error('   2. Update META_WHATSAPP_ACCESS_TOKEN in .env');
        console.error('   3. Restart your server');
        console.error('');
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

verifyToken();
