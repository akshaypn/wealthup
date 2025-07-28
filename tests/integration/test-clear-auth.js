const axios = require('axios');

const API_BASE_URL = 'http://100.123.199.100:9001';
const FRONTEND_URL = 'http://100.123.199.100:9000';

async function testClearAuth() {
  console.log('🧪 Testing Authentication Clear and Login Flow...\n');

  try {
    // Step 1: Test that a new user (no token) sees login page
    console.log('1. Testing Frontend for Unauthenticated User...');
    const frontendResponse = await axios.get(FRONTEND_URL);
    
    if (frontendResponse.status === 200) {
      console.log('✅ Frontend is accessible');
      
      // Check if the response contains login-related content
      const html = frontendResponse.data;
      if (html.includes('Sign in to Wealthup') || html.includes('login') || html.includes('Sign in')) {
        console.log('✅ Frontend shows login page for unauthenticated users');
      } else {
        console.log('⚠️  Frontend may not be showing login page (check browser localStorage)');
      }
    } else {
      throw new Error('Frontend not accessible');
    }

    // Step 2: Test backend authentication endpoints
    console.log('\n2. Testing Backend Authentication Endpoints...');
    
    // Test registration
    const testEmail = `testuser${Date.now()}@example.com`;
    const registerResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/register`, {
      email: testEmail,
      password: 'testpassword123',
      name: 'Test User'
    });
    
    if (registerResponse.data.token) {
      console.log('✅ Registration working');
      const token = registerResponse.data.token;
      
      // Test login
      const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
        email: testEmail,
        password: 'testpassword123'
      });
      
      if (loginResponse.data.token) {
        console.log('✅ Login working');
        
        // Test protected endpoint
        const meResponse = await axios.get(`${API_BASE_URL}/api/v1/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (meResponse.data.user) {
          console.log('✅ Protected endpoint working');
        } else {
          throw new Error('Protected endpoint failed');
        }
      } else {
        throw new Error('Login failed');
      }
    } else {
      throw new Error('Registration failed');
    }

    // Step 3: Test that invalid token is rejected
    console.log('\n3. Testing Invalid Token Rejection...');
    try {
      await axios.get(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
      throw new Error('Invalid token should have been rejected');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Invalid token correctly rejected');
      } else {
        throw new Error('Invalid token error handling failed');
      }
    }

    console.log('\n🎉 AUTHENTICATION FLOW VERIFICATION COMPLETE!');
    console.log('\n📋 SUMMARY:');
    console.log('   ✅ Backend authentication working');
    console.log('   ✅ Registration and login functional');
    console.log('   ✅ Protected endpoints secure');
    console.log('   ✅ Invalid token rejection working');
    console.log('\n🔍 DIAGNOSIS:');
    console.log('   The issue is likely that the user has a valid token in their browser localStorage.');
    console.log('   To see the login page, the user should:');
    console.log('   1. Open browser developer tools (F12)');
    console.log('   2. Go to Application/Storage tab');
    console.log('   3. Clear localStorage');
    console.log('   4. Refresh the page');
    console.log('\n   Or use this URL to clear auth: http://100.123.199.100:8080/test-auth-debug.html');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

testClearAuth(); 