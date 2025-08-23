const { handler } = require('../index');

describe('API Integration Tests - Core Functionality', () => {
  const testChatId = 'test_user_123';
  const testUsername = 'TestUser';

  // Helper to create mock Lambda event
  const createEvent = (method, path, queryParams = {}, body = null) => ({
    rawPath: path,
    requestContext: {
      http: {
        method: method
      }
    },
    queryStringParameters: Object.keys(queryParams).length > 0 ? queryParams : null,
    body: body ? JSON.stringify(body) : null
  });

  // Helper to parse response
  const parseResponse = (response) => {
    return {
      statusCode: response.statusCode,
      data: JSON.parse(response.body)
    };
  };

  describe('User Management', () => {
    test('should create a user', async () => {
      const event = createEvent('POST', '/api/v1/users', {}, {
        chatId: testChatId,
        username: testUsername
      });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(201);
      expect(data.user).toBeDefined();
      expect(data.user.ChatId).toBe(testChatId);
      expect(data.user.Username).toBe(testUsername);
      expect(data.user.Tickets).toBe(0);
    });

    test('should get user data', async () => {
      const event = createEvent('GET', `/api/v1/users/${testChatId}`);

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.ChatId).toBe(testChatId);
      expect(data.user.Username).toBe(testUsername);
    });

    test('should handle user not found', async () => {
      const event = createEvent('GET', '/api/v1/users/nonexistent_user');

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(500); // Service throws error that becomes 500
      expect(data.error).toBeDefined(); // Just check that there's an error
    });
  });

  describe('Goal Management', () => {
    test('should list goals (empty initially)', async () => {
      const event = createEvent('GET', '/api/v1/goals', { chatId: testChatId });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(200);
      expect(data.goals).toBeDefined();
      expect(Array.isArray(data.goals)).toBe(true);
    });

    test('should add a goal', async () => {
      const goalText = 'Test goal for integration test';
      const event = createEvent('POST', '/api/v1/goals', {}, {
        chatId: testChatId,
        text: goalText
      });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(201);
      expect(data.goal).toBeDefined();
      expect(data.goal.text).toBe(goalText);
      expect(data.goal.completed).toBe(false);
      expect(data.addedTo).toBe('self');
    });

    test('should list goals (with added goal)', async () => {
      const event = createEvent('GET', '/api/v1/goals', { chatId: testChatId });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(200);
      expect(data.goals).toBeDefined();
      expect(data.goals.length).toBeGreaterThan(0);
      expect(data.goals[0].text).toBe('Test goal for integration test');
      expect(data.goals[0].completed).toBe(false);
    });

    test('should complete a goal', async () => {
      const goalIndex = 0;
      const event = createEvent('POST', `/api/v1/goals/${goalIndex}/complete`, {}, {
        chatId: testChatId
      });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(200);
      expect(data.goal).toBeDefined();
      expect(data.goal.completed).toBe(true);
      expect(data.goal.completedAt).toBeDefined();
      expect(data.ticketAwarded).toBe(true);
    });

    test('should show completed goal in list', async () => {
      const event = createEvent('GET', '/api/v1/goals', { chatId: testChatId });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(200);
      expect(data.goals[0].completed).toBe(true);
    });

    test('should add another goal for deletion test', async () => {
      const goalText = 'Goal to be deleted';
      const event = createEvent('POST', '/api/v1/goals', {}, {
        chatId: testChatId,
        text: goalText
      });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(201);
      expect(data.goal.text).toBe(goalText);
    });

    test('should delete a goal', async () => {
      // Delete the second goal (index 1)
      const goalIndex = 1;
      const event = createEvent('DELETE', `/api/v1/goals/${goalIndex}`, { 
        chatId: testChatId 
      });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(200);
      expect(data.deleted).toBeDefined();
      expect(data.deleted.text).toBe('Goal to be deleted');
    });

    test('should show goal was deleted from list', async () => {
      const event = createEvent('GET', '/api/v1/goals', { chatId: testChatId });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(200);
      expect(data.goals.length).toBe(1); // Should only have the first goal left
      expect(data.goals[0].text).toBe('Test goal for integration test');
    });

    test('should handle invalid goal index for completion', async () => {
      const invalidIndex = 999;
      const event = createEvent('POST', `/api/v1/goals/${invalidIndex}/complete`, {}, {
        chatId: testChatId
      });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(500); // Service error becomes 500
      expect(data.error).toContain('Invalid goal index');
    });

    test('should handle invalid goal index for deletion', async () => {
      const invalidIndex = 999;
      const event = createEvent('DELETE', `/api/v1/goals/${invalidIndex}`, { 
        chatId: testChatId 
      });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(500); // Service error becomes 500
      expect(data.error).toContain('Invalid goal index');
    });
  });

  describe('Input Validation', () => {
    test('should require chatId for listing goals', async () => {
      const event = createEvent('GET', '/api/v1/goals', {});

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(400);
      expect(data.error).toContain('chatId');
    });

    test('should require chatId and text for adding goal', async () => {
      const event = createEvent('POST', '/api/v1/goals', {}, {
        text: 'Goal without chatId'
      });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(400);
      expect(data.error).toContain('chatId');
    });

    test('should require text for adding goal', async () => {
      const event = createEvent('POST', '/api/v1/goals', {}, {
        chatId: testChatId
      });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(400);
      expect(data.error).toContain('text');
    });

    test('should require chatId and username for creating user', async () => {
      const event = createEvent('POST', '/api/v1/users', {}, {
        username: 'NoIdUser'
      });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(400);
      expect(data.error).toContain('chatId');
    });
  });

  describe('Legacy Endpoints', () => {
    test('should support legacy getAllData endpoint', async () => {
      const event = createEvent('GET', '/getAllData');

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(200);
      expect(data.goals).toBeDefined();
      expect(data.rewards).toBeDefined();
      expect(data.userGoals).toBeDefined();
      expect(Array.isArray(data.goals)).toBe(true);
      expect(Array.isArray(data.rewards)).toBe(true);
      expect(Array.isArray(data.userGoals)).toBe(true);
    });

    test('should support legacy getUserData endpoint', async () => {
      const event = createEvent('GET', '/getUserData', { chatId: testChatId });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.ChatId).toBe(testChatId);
    });

    test('should support legacy addGoal endpoint', async () => {
      const goalText = 'Legacy goal test';
      const event = createEvent('POST', '/addGoal', {}, {
        chatId: testChatId,
        text: goalText
      });

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Route Not Found', () => {
    test('should return 404 for unknown routes', async () => {
      const event = createEvent('GET', '/api/v1/nonexistent');

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(404);
      expect(data.error).toContain('Route not found');
    });

    test('should return 404 for wrong method on existing route', async () => {
      const event = createEvent('PATCH', '/api/v1/goals');

      const response = await handler(event);
      const { statusCode, data } = parseResponse(response);

      expect(statusCode).toBe(404);
      expect(data.error).toContain('Route not found');
    });
  });
});