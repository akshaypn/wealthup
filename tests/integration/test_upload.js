const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testUpload() {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./data/canara_bank/data.csv'));
    formData.append('bank', 'canara_bank');

    console.log('📤 Testing CSV upload...');
    
    const response = await axios.post('http://localhost:9001/api/v1/upload/csv', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': 'Bearer test-token'
      }
    });

    console.log('✅ Upload successful:', response.data);
  } catch (error) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
  }
}

testUpload(); 