# Tests

This directory contains all test files for the Wealthup application.

## Structure

- `integration/` - Integration tests for API endpoints and full application flows
  - `test_auth_flow.js` - Authentication flow tests
  - `test_upload.js` - File upload functionality tests
  - `test_authenticated_upload.js` - Authenticated file upload tests
  - `test_full_upload.js` - Complete upload workflow tests
  - `test_google_auth.html` - Google OAuth integration tests
  - `test_frontend_with_token.html` - Frontend authentication tests
  - `test-*.js` - Various integration test scenarios

## Running Tests

### Integration Tests
```bash
# Run all integration tests
node tests/integration/test_auth_flow.js
node tests/integration/test_upload.js
node tests/integration/test_authenticated_upload.js
```

### Manual Testing
Open the HTML test files in a browser to test frontend functionality:
- `tests/integration/test_google_auth.html` - Test Google OAuth
- `tests/integration/test_frontend_with_token.html` - Test frontend with authentication

## Test Categories

1. **Authentication Tests** - Verify login, registration, and token management
2. **Upload Tests** - Test CSV file upload and processing
3. **API Tests** - Verify backend API endpoints
4. **Frontend Tests** - Test React components and user interactions
5. **Integration Tests** - End-to-end workflow testing

## Notes

- Tests use the development environment (localhost:9001 for backend)
- Some tests require manual setup (like Google OAuth credentials)
- HTML tests are for browser-based manual testing
- JavaScript tests can be run from command line 