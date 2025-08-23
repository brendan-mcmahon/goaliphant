# API Integration Tests

This directory contains integration tests for the core Goaliphant API functionality.

## What's Tested

The tests focus on the most commonly used endpoints:

✅ **User Management**
- Create user
- Get user data
- Handle user not found

✅ **Goal Management** 
- List goals (empty and with data)
- Add goal
- Complete goal (with ticket awarding)
- Delete goal
- Handle invalid goal indices

✅ **Input Validation**
- Required parameters for all endpoints
- Proper error messages

✅ **Legacy Endpoints**
- Backward compatibility support
- Legacy getAllData, getUserData, addGoal

✅ **Error Handling**
- 404 for unknown routes
- 400 for missing parameters
- 500 for service errors

## How to Run

From the `api/` directory:

```bash
# Install dependencies (including Jest)
npm install

# Run tests once
npm test

# Run tests in watch mode (reruns on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Strategy

These are **integration tests** that test the full flow:
1. HTTP request parsing
2. Route matching  
3. Service layer execution
4. Database operations
5. Response formatting

The tests use real AWS Lambda event structures and call the actual handler function, providing confidence that the API works end-to-end.

## Test Data

Tests use a test user: `test_user_123` with username `TestUser`

Each test run creates/modifies data for this user, testing the complete goal lifecycle from creation to completion to deletion.