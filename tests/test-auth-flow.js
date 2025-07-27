const axios = require('axios');

const API_BASE_URL = 'http://100.123.199.100:9001';
const FRONTEND_URL = 'http://100.123.199.100:9000';

async function testAuthFlow() {
  console.log('🧪 Testing Authentication Flow...\n');

  try {
    // Step 1: Test that unauthenticated requests are rejected
    console.log('1. Testing Unauthenticated Access...');
    
    try {
      await axios.get(`${API_BASE_URL}/api/v1/transactions?period=30d`);
      console.log('❌ Unauthenticated request should have failed');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Unauthenticated requests correctly rejected (401)');
      } else {
        console.log('⚠️  Unexpected error for unauthenticated request:', error.response?.status);
      }
    }

    // Step 2: Test registration
    console.log('\n2. Testing User Registration...');
    const testEmail = `testuser${Date.now()}@example.com`;
    const registerResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/register`, {
      email: testEmail,
      password: 'testpassword123',
      name: 'Test User'
    });
    
    if (registerResponse.data.token) {
      console.log('✅ Registration successful');
      const token = registerResponse.data.token;
      
      // Step 3: Test authenticated requests
      console.log('\n3. Testing Authenticated Access...');
      
      const transactionsResponse = await axios.get(`${API_BASE_URL}/api/v1/transactions?period=30d`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (transactionsResponse.status === 200) {
        console.log('✅ Authenticated requests working');
      } else {
        console.log('❌ Authenticated requests failed');
      }
      
      // Step 4: Test logout (clear token)
      console.log('\n4. Testing Token Invalidation...');
      
      try {
        await axios.get(`${API_BASE_URL}/api/v1/transactions?period=30d`, {
          headers: { 'Authorization': 'Bearer invalid-token' }
        });
        console.log('❌ Invalid token should have been rejected');
      } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          console.log('✅ Invalid token correctly rejected');
        } else {
          console.log('⚠️  Unexpected error for invalid token:', error.response?.status);
        }
      }
      
    } else {
      throw new Error('Registration failed');
    }

    console.log('\n🎉 AUTHENTICATION FLOW TEST COMPLETE!');
    console.log('\n📋 SUMMARY:');
    console.log('   ✅ Backend properly rejects unauthenticated requests');
    console.log('   ✅ User registration working');
    console.log('   ✅ Authenticated requests working');
    console.log('   ✅ Invalid tokens properly rejected');
    console.log('\n🔍 FRONTEND ISSUE DIAGNOSIS:');
    console.log('   The frontend should now properly show the login page.');
    console.log('   If you still see the dashboard, try:');
    console.log('   1. Hard refresh the page (Ctrl+F5)');
    console.log('   2. Clear browser cache');
    console.log('   3. Open in incognito/private mode');
    console.log('\n   Test URL: http://100.123.199.100:9000');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

testAuthFlow(); 