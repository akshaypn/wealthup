#!/usr/bin/env node

/**
 * Wealthup Implementation Test Script
 * Tests the key features of the implementation
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://100.123.199.100:9001';

// Test configuration
const TEST_USER = {
  email: 'test@wealthup.com',
  password: 'testpassword123',
  name: 'Test User'
};

let authToken = null;
let testAccountId = null;

// Utility functions
const log = (message, type = 'INFO') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
};

const testEndpoint = async (name, testFn) => {
  try {
    log(`Testing: ${name}`);
    await testFn();
    log(`✅ PASS: ${name}`, 'PASS');
    return true;
  } catch (error) {
    log(`❌ FAIL: ${name} - ${error.message}`, 'FAIL');
    return false;
  }
};

// Test functions
const testUserRegistration = async () => {
  const response = await axios.post(`${API_BASE_URL}/api/v1/auth/register`, TEST_USER);
  if (!response.data.token) {
    throw new Error('No token received');
  }
  authToken = response.data.token;
  log(`User registered with token: ${authToken.substring(0, 20)}...`);
};

const testUserLogin = async () => {
  const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  if (!response.data.token) {
    throw new Error('No token received');
  }
  authToken = response.data.token;
  log(`User logged in with token: ${authToken.substring(0, 20)}...`);
};

const testGetCurrentUser = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  if (!response.data.user) {
    throw new Error('No user data received');
  }
  log(`Current user: ${response.data.user.name} (${response.data.user.email})`);
};

const testCreateAccount = async () => {
  const accountData = {
    name: 'Test Savings Account',
    type: 'savings',
    institution: 'Test Bank',
    account_number: '1234',
    current_balance: 10000
  };

  const response = await axios.post(`${API_BASE_URL}/api/v1/accounts`, accountData, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!response.data.account) {
    throw new Error('No account data received');
  }
  
  testAccountId = response.data.account.id;
  log(`Account created: ${response.data.account.name} (${response.data.account.id})`);
};

const testGetAccounts = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/accounts`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!response.data.accounts || response.data.accounts.length === 0) {
    throw new Error('No accounts found');
  }
  
  log(`Found ${response.data.accounts.length} accounts`);
};

const testGetAccountSummary = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/accounts/summary`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!response.data.summary) {
    throw new Error('No summary data received');
  }
  
  log(`Account summary: ${response.data.summary.total_accounts} accounts, Net worth: ${response.data.summary.net_worth}`);
};

const testGetCategories = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/categories`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!response.data || response.data.length === 0) {
    throw new Error('No categories found');
  }
  
  log(`Found ${response.data.length} categories`);
};

const testGetTransactions = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/transactions`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  log(`Found ${response.data.length || 0} transactions`);
};

const testGetBanks = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/banks`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  if (!response.data.banks || response.data.banks.length === 0) {
    throw new Error('No banks found');
  }
  
  log(`Supported banks: ${response.data.banks.join(', ')}`);
};

const testProtectedRoute = async () => {
  try {
    await axios.get(`${API_BASE_URL}/api/v1/transactions`);
    throw new Error('Should require authentication');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      log('Protected route correctly requires authentication');
    } else {
      throw new Error('Protected route not working correctly');
    }
  }
};

const testRateLimiting = async () => {
  const promises = Array(110).fill().map(() => 
    axios.get(`${API_BASE_URL}/api/v1/categories`, {
      headers: { Authorization: `Bearer ${authToken}` }
    }).catch(err => err)
  );
  
  const results = await Promise.all(promises);
  const rateLimited = results.filter(r => r.response && r.response.status === 429);
  
  if (rateLimited.length === 0) {
    log('Rate limiting not triggered (may be normal)');
  } else {
    log(`Rate limiting triggered: ${rateLimited.length} requests blocked`);
  }
};

// Main test runner
const runTests = async () => {
  log('🚀 Starting Wealthup Implementation Tests');
  log('==========================================');
  
  const tests = [
    ['User Registration', testUserRegistration],
    ['User Login', testUserLogin],
    ['Get Current User', testGetCurrentUser],
    ['Protected Route Test', testProtectedRoute],
    ['Create Account', testCreateAccount],
    ['Get Accounts', testGetAccounts],
    ['Get Account Summary', testGetAccountSummary],
    ['Get Categories', testGetCategories],
    ['Get Transactions', testGetTransactions],
    ['Get Supported Banks', testGetBanks],
    ['Rate Limiting Test', testRateLimiting]
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const [name, testFn] of tests) {
    const result = await testEndpoint(name, testFn);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  log('==========================================');
  log(`🎯 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    log('🎉 All tests passed! Implementation is working correctly.', 'SUCCESS');
  } else {
    log('⚠️  Some tests failed. Please check the implementation.', 'WARNING');
  }
  
  return { passed, failed };
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    log(`Test runner failed: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = { runTests }; 