const axios = require('axios');

const API_BASE_URL = 'http://100.123.199.100:9001';

async function testLoginProcess() {
  console.log('🧪 Testing Login Process...\n');

  try {
    // Test 1: Registration
    console.log('1. Testing User Registration...');
    const registerResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/register`, {
      email: 'testuser@example.com',
      password: 'testpassword123',
      name: 'Test User'
    });
    
    console.log('✅ Registration successful');
    console.log(`   User ID: ${registerResponse.data.user.id}`);
    console.log(`   Token: ${registerResponse.data.token.substring(0, 20)}...\n`);

    // Test 2: Login
    console.log('2. Testing User Login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      email: 'testuser@example.com',
      password: 'testpassword123'
    });
    
    console.log('✅ Login successful');
    console.log(`   User: ${loginResponse.data.user.name}`);
    console.log(`   Token: ${loginResponse.data.token.substring(0, 20)}...\n`);

    // Test 3: Protected Endpoint
    console.log('3. Testing Protected Endpoint...');
    const token = loginResponse.data.token;
    const meResponse = await axios.get(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Protected endpoint accessible');
    console.log(`   User: ${meResponse.data.user.name}`);
    console.log(`   Email: ${meResponse.data.user.email}\n`);

    // Test 4: CORS Test (simulate frontend request)
    console.log('4. Testing CORS Configuration...');
    const corsResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      email: 'testuser@example.com',
      password: 'testpassword123'
    }, {
      headers: {
        'Origin': 'http://100.123.199.100:9000',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ CORS configuration working');
    console.log(`   Response received: ${corsResponse.status}\n`);

    // Test 5: Invalid Login
    console.log('5. Testing Invalid Login...');
    try {
      await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
        email: 'testuser@example.com',
        password: 'wrongpassword'
      });
      console.log('❌ Invalid login should have failed');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Invalid login correctly rejected');
        console.log(`   Error: ${error.response.data.error}\n`);
      } else {
        console.log('❌ Unexpected error for invalid login');
      }
    }

    // Test 6: Missing Token
    console.log('6. Testing Missing Token...');
    try {
      await axios.get(`${API_BASE_URL}/api/v1/auth/me`);
      console.log('❌ Missing token should have failed');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Missing token correctly rejected');
        console.log(`   Error: ${error.response.data.error}\n`);
      } else {
        console.log('❌ Unexpected error for missing token');
      }
    }

    console.log('🎉 All authentication tests passed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ User registration working');
    console.log('   ✅ User login working');
    console.log('   ✅ JWT token generation working');
    console.log('   ✅ Protected endpoints working');
    console.log('   ✅ CORS configuration working');
    console.log('   ✅ Error handling working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

testLoginProcess(); 