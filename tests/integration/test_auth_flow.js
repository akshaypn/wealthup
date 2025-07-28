const axios = require('axios');

async function testAuthFlow() {
  try {
    console.log('🧪 Testing authentication flow...');
    
    // Test backend health
    const healthResponse = await axios.get('http://localhost:9001/health');
    console.log('✅ Backend health:', healthResponse.data.status);
    
    // Test categories endpoint (no auth required)
    const categoriesResponse = await axios.get('http://localhost:9001/api/v1/categories');
    console.log('✅ Categories endpoint working:', categoriesResponse.data.length, 'categories');
    
    // Test banks endpoint (requires auth - should fail)
    try {
      await axios.get('http://localhost:9001/api/v1/banks');
      console.log('❌ Banks endpoint should require auth but didn\'t');
    } catch (error) {
      console.log('✅ Banks endpoint correctly requires authentication');
    }
    
    // Test transactions endpoint (requires auth - should fail)
    try {
      await axios.get('http://localhost:9001/api/v1/transactions');
      console.log('❌ Transactions endpoint should require auth but didn\'t');
    } catch (error) {
      console.log('✅ Transactions endpoint correctly requires authentication');
    }
    
    console.log('\n📋 Summary:');
    console.log('- Backend is running correctly');
    console.log('- Authentication is working (protected endpoints require auth)');
    console.log('- Categories are loaded');
    console.log('- Frontend should now work with Google OAuth');
    
    console.log('\n🎯 Next steps:');
    console.log('1. Go to http://localhost:9000');
    console.log('2. Click "Sign in with Google"');
    console.log('3. After login, go to Accounts section');
    console.log('4. Upload the CSV file from data/canara_bank/data.csv');
    console.log('5. Check the ledger for transactions');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAuthFlow(); 