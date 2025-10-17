/**
 * Test WhatsApp Template Message
 * This tests if WhatsApp delivery is working using the existing hello_world template
 */

require('dotenv').config();
const axios = require('axios');

async function testWhatsAppTemplate() {
  const phoneNumber = '919418245371'; // Your phone number
  const apiUrl = process.env.META_WHATSAPP_API_URL || 'https://graph.facebook.com/v22.0';
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;

  console.log('\n' + '='.repeat(60));
  console.log('📱 TESTING WHATSAPP TEMPLATE MESSAGE');
  console.log('='.repeat(60));
  console.log(`📞 To: ${phoneNumber}`);
  console.log(`🔗 API URL: ${apiUrl}/${phoneNumberId}/messages`);
  console.log(`🔑 Token: ${accessToken ? accessToken.substring(0, 20) + '...' : 'MISSING'}`);
  console.log(`📞 Phone ID: ${phoneNumberId || 'MISSING'}`);
  console.log('='.repeat(60) + '\n');

  if (!phoneNumberId || !accessToken) {
    console.error('❌ Missing credentials! Check your .env file.');
    console.log('\nRequired in .env:');
    console.log('META_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id');
    console.log('META_WHATSAPP_ACCESS_TOKEN=your_access_token');
    return;
  }

  try {
    // Test with existing hello_world template
    const requestBody = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'hello_world',
        language: {
          code: 'en_US'
        }
      }
    };

    console.log('📦 Request Body:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('\n📤 Sending message...\n');

    const response = await axios.post(
      `${apiUrl}/${phoneNumberId}/messages`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SUCCESS! WhatsApp API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n' + '='.repeat(60));
    console.log('🎉 MESSAGE SENT SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📱 Check your WhatsApp on +919418245371');
    console.log('You should receive the "Hello World" message!\n');

    if (response.data.messages?.[0]?.id) {
      console.log(`✅ Message ID: ${response.data.messages[0].id}`);
      console.log(`✅ Recipient: ${response.data.contacts?.[0]?.wa_id || phoneNumber}\n`);
    }

  } catch (error) {
    console.error('\n❌ ERROR sending WhatsApp message:');
    console.error('='.repeat(60));
    
    if (error.response?.data) {
      console.error('Error Details:', JSON.stringify(error.response.data, null, 2));
      
      const errorMsg = error.response.data.error?.message;
      const errorCode = error.response.data.error?.code;
      
      console.error('\n🔍 Troubleshooting:');
      
      if (errorMsg?.includes('phone number')) {
        console.error('❌ Phone number issue:');
        console.error('   - Add +919418245371 to test recipients in Meta dashboard');
        console.error('   - Go to: https://business.facebook.com/wa/manage/phone-numbers/');
      } else if (errorMsg?.includes('template')) {
        console.error('❌ Template issue:');
        console.error('   - Template "hello_world" not found or not approved');
        console.error('   - Check: https://business.facebook.com/wa/manage/message-templates/');
      } else if (errorMsg?.includes('token') || errorCode === 190) {
        console.error('❌ Access token issue:');
        console.error('   - Token expired or invalid');
        console.error('   - Generate new token in Meta dashboard');
      } else {
        console.error('❌ Unknown error - check error details above');
      }
    } else {
      console.error('Error:', error.message);
    }
    
    console.error('='.repeat(60) + '\n');
  }
}

// Run test
testWhatsAppTemplate();
