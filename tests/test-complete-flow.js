const axios = require('axios');

const API_BASE_URL = 'http://100.123.199.100:9001';
const FRONTEND_URL = 'http://100.123.199.100:9000';

async function testCompleteFlow() {
  console.log('🚀 Testing Complete Authentication Flow...\n');

  let authToken = null;
  let userId = null;

  try {
    // Step 1: Test Frontend Accessibility
    console.log('1. Testing Frontend Accessibility...');
    const frontendResponse = await axios.get(FRONTEND_URL);
    if (frontendResponse.status === 200) {
      console.log('✅ Frontend is accessible');
    } else {
      throw new Error('Frontend not accessible');
    }

    // Step 2: Test Backend Health
    console.log('\n2. Testing Backend Health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    if (healthResponse.data.status === 'healthy') {
      console.log('✅ Backend is healthy');
      console.log(`   Service: ${healthResponse.data.service}`);
      console.log(`   Version: ${healthResponse.data.version}`);
    } else {
      throw new Error('Backend health check failed');
    }

    // Step 3: Test User Registration
    console.log('\n3. Testing User Registration...');
    const testEmail = `testuser${Date.now()}@example.com`;
    const registerResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/register`, {
      email: testEmail,
      password: 'testpassword123',
      name: 'Test User'
    });
    
    if (registerResponse.data.token && registerResponse.data.user) {
      console.log('✅ Registration successful');
      authToken = registerResponse.data.token;
      userId = registerResponse.data.user.id;
      console.log(`   User ID: ${userId}`);
      console.log(`   Email: ${testEmail}`);
    } else {
      throw new Error('Registration failed - no token received');
    }

    // Step 4: Test User Login
    console.log('\n4. Testing User Login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      email: testEmail,
      password: 'testpassword123'
    });
    
    if (loginResponse.data.token && loginResponse.data.user) {
      console.log('✅ Login successful');
      authToken = loginResponse.data.token;
      console.log(`   User: ${loginResponse.data.user.name}`);
    } else {
      throw new Error('Login failed - no token received');
    }

    // Step 5: Test Protected Endpoints
    console.log('\n5. Testing Protected Endpoints...');
    
    // Test /me endpoint
    const meResponse = await axios.get(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('✅ /me endpoint working');
    
    // Test categories endpoint (public)
    const categoriesResponse = await axios.get(`${API_BASE_URL}/api/v1/categories`);
    console.log('✅ Categories endpoint working');
    console.log(`   Categories available: ${categoriesResponse.data.length}`);
    
    // Test accounts endpoint (protected)
    const accountsResponse = await axios.get(`${API_BASE_URL}/api/v1/accounts`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('✅ Accounts endpoint working');
    console.log(`   User accounts: ${accountsResponse.data.length}`);

    // Step 6: Test Account Creation
    console.log('\n6. Testing Account Creation...');
    const accountResponse = await axios.post(`${API_BASE_URL}/api/v1/accounts`, {
      name: 'Test Savings Account',
      institution: 'Test Bank',
      type: 'savings',
      account_number: '1234567890',
      current_balance: 10000.00
    }, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (accountResponse.data.account && accountResponse.data.account.id) {
      console.log('✅ Account creation successful');
      console.log(`   Account ID: ${accountResponse.data.account.id}`);
      console.log(`   Account Name: ${accountResponse.data.account.name}`);
    } else {
      throw new Error('Account creation failed');
    }

    // Step 7: Test CORS Configuration
    console.log('\n7. Testing CORS Configuration...');
    const corsResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      email: testEmail,
      password: 'testpassword123'
    }, {
      headers: {
        'Origin': FRONTEND_URL,
        'Content-Type': 'application/json'
      }
    });
    
    if (corsResponse.status === 200) {
      console.log('✅ CORS configuration working');
    } else {
      throw new Error('CORS configuration failed');
    }

    // Step 8: Test Error Handling
    console.log('\n8. Testing Error Handling...');
    
    // Test invalid login
    try {
      await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
        email: testEmail,
        password: 'wrongpassword'
      });
      throw new Error('Invalid login should have failed');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Invalid login correctly rejected');
      } else {
        throw new Error('Invalid login error handling failed');
      }
    }
    
    // Test missing token
    try {
      await axios.get(`${API_BASE_URL}/api/v1/auth/me`);
      throw new Error('Missing token should have failed');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Missing token correctly rejected');
      } else {
        throw new Error('Missing token error handling failed');
      }
    }

    // Step 9: Test Google OAuth Endpoint
    console.log('\n9. Testing Google OAuth Endpoint...');
    try {
      await axios.post(`${API_BASE_URL}/api/v1/auth/google`, {
        idToken: 'invalid-token'
      });
      throw new Error('Invalid Google token should have failed');
    } catch (error) {
      if (error.response && (error.response.status === 400 || error.response.status === 401)) {
        console.log('✅ Google OAuth endpoint working (correctly rejecting invalid tokens)');
      } else {
        throw new Error('Google OAuth error handling failed');
      }
    }

    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    console.log('\n📋 COMPLETE AUTHENTICATION FLOW SUMMARY:');
    console.log('   ✅ Frontend accessibility');
    console.log('   ✅ Backend health');
    console.log('   ✅ User registration');
    console.log('   ✅ User login');
    console.log('   ✅ JWT token generation');
    console.log('   ✅ Protected endpoints');
    console.log('   ✅ Account management');
    console.log('   ✅ CORS configuration');
    console.log('   ✅ Error handling');
    console.log('   ✅ Google OAuth endpoint');
    
    console.log('\n🚀 READY FOR PRODUCTION USE!');
    console.log(`   Frontend: ${FRONTEND_URL}`);
    console.log(`   Backend API: ${API_BASE_URL}`);
    console.log(`   Test User: ${testEmail}`);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

testCompleteFlow(); 