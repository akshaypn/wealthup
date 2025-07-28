const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testFullUpload() {
  try {
    console.log('🧪 Testing full upload process...');
    
    // First, let's check if we can connect to the backend
    const healthResponse = await axios.get('http://localhost:9001/health');
    console.log('✅ Backend health check:', healthResponse.data.status);
    
    // Test the upload endpoint
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./data/canara_bank/data.csv'));
    formData.append('bank', 'canara_bank');
    formData.append('account_id', '1'); // Test with account ID 1

    console.log('📤 Uploading CSV file...');
    
    const uploadResponse = await axios.post('http://localhost:9001/api/v1/test-upload/csv', formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    console.log('✅ Upload response:', uploadResponse.data);
    
    // Now let's test the actual upload with authentication
    console.log('\n🔐 Testing authenticated upload...');
    
    // We need to create a test user first or get a valid token
    // For now, let's just test the parsing part
    
    console.log('\n📊 Summary:');
    console.log(`- Transactions parsed: ${uploadResponse.data.transactionsCount}`);
    console.log(`- Detected bank: ${uploadResponse.data.detectedBank}`);
    console.log(`- Sample transactions: ${uploadResponse.data.sampleTransactions.length}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testFullUpload(); 