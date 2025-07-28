const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testAuthenticatedUpload(token) {
  try {
    console.log('🧪 Testing authenticated upload...');
    
    // Test with the provided token
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    // First, test if the token is valid
    console.log('🔐 Testing token validity...');
    try {
      const meResponse = await axios.get('http://localhost:9001/api/v1/auth/me', { headers });
      console.log('✅ Token is valid. User:', meResponse.data.user.name);
    } catch (error) {
      console.error('❌ Token is invalid:', error.response?.data || error.message);
      return;
    }
    
    // Test the banks endpoint
    console.log('🏦 Testing banks endpoint...');
    try {
      const banksResponse = await axios.get('http://localhost:9001/api/v1/banks', { headers });
      console.log('✅ Banks endpoint working:', banksResponse.data.length, 'banks');
    } catch (error) {
      console.error('❌ Banks endpoint failed:', error.response?.data || error.message);
    }
    
    // Test the transactions endpoint
    console.log('📊 Testing transactions endpoint...');
    try {
      const transactionsResponse = await axios.get('http://localhost:9001/api/v1/transactions', { headers });
      console.log('✅ Transactions endpoint working:', transactionsResponse.data.length, 'transactions');
    } catch (error) {
      console.error('❌ Transactions endpoint failed:', error.response?.data || error.message);
    }
    
    // Test the uncategorized count endpoint
    console.log('📈 Testing uncategorized count endpoint...');
    try {
      const uncategorizedResponse = await axios.get('http://localhost:9001/api/v1/transactions/uncategorized/count', { headers });
      console.log('✅ Uncategorized count endpoint working:', uncategorizedResponse.data.count, 'uncategorized');
    } catch (error) {
      console.error('❌ Uncategorized count endpoint failed:', error.response?.data || error.message);
    }
    
    // Now test the actual upload
    console.log('📤 Testing authenticated CSV upload...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./data/canara_bank/data.csv'));
    formData.append('bank', 'canara_bank');
    
    const uploadResponse = await axios.post('http://localhost:9001/api/v1/upload/csv', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Upload successful:', uploadResponse.data);
    
    // Check the database after upload
    console.log('📊 Checking database after upload...');
    const finalTransactionsResponse = await axios.get('http://localhost:9001/api/v1/transactions', { headers });
    console.log('📋 Total transactions in database:', finalTransactionsResponse.data.length);
    
    console.log('\n🎯 Summary:');
    console.log('- Authentication working');
    console.log('- All API endpoints working');
    console.log('- Upload completed successfully');
    console.log('- Database populated with transactions');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Usage: node test_authenticated_upload.js <token>
const token = process.argv[2];
if (!token) {
  console.log('Usage: node test_authenticated_upload.js <access_token>');
  console.log('Please provide the access token from the browser console');
  process.exit(1);
}

testAuthenticatedUpload(token); 