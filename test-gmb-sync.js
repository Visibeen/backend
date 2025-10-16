/**
 * Test GMB Account Sync
 * Quick test to verify the sync endpoint works
 */

const axios = require('axios');

async function testSync() {
  try {
    console.log('🧪 Testing GMB account sync...');
    
    const testData = {
      user_id: 194,
      account_id: 'test-account-123',
      location_id: 'locations/5887747752895656692',
      business_name: 'Test Business',
      location_name: 'Test Location',
      address: 'Test Address',
      phone_number: '1234567890',
      website: 'https://test.com',
      category: 'Test Category',
      location_data: { test: 'data' },
      is_verified: false
    };
    
    console.log('📤 Sending test data:', testData);
    
    const response = await axios.post('http://localhost:5000/api/v1/admin/gmb-account/sync', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('📥 Response data:', response.data);
    
    if (response.data.success) {
      console.log('✅ Sync successful!');
      console.log('Account ID:', response.data.data?.account?.id);
    } else {
      console.log('❌ Sync failed:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testSync();
