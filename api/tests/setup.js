// Jest setup for API tests - mocks AWS services

// Mock AWS SDK
const mockDynamoDB = {
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  query: jest.fn(),
  scan: jest.fn()
};

// Mock AWS SDK DocumentClient
const mockDocumentClient = {
  get: jest.fn().mockReturnValue({ promise: () => Promise.resolve({ Item: null }) }),
  put: jest.fn().mockReturnValue({ promise: () => Promise.resolve({}) }),
  update: jest.fn().mockReturnValue({ promise: () => Promise.resolve({}) }),
  delete: jest.fn().mockReturnValue({ promise: () => Promise.resolve({}) }),
  query: jest.fn().mockReturnValue({ promise: () => Promise.resolve({ Items: [] }) }),
  scan: jest.fn().mockReturnValue({ promise: () => Promise.resolve({ Items: [] }) })
};

// Mock the AWS SDK module
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => mockDocumentClient)
  },
  config: {
    update: jest.fn()
  }
}));

// In-memory storage for testing
const testStorage = {
  users: {},
  goals: {},
  rewards: {}
};

// Test data helper functions
global.testHelpers = {
  // Reset test storage
  resetStorage: () => {
    testStorage.users = {};
    testStorage.goals = {};
    testStorage.rewards = {};
  },
  
  // Get storage for inspection
  getStorage: () => testStorage,
  
  // Mock user operations
  setUser: (chatId, user) => {
    testStorage.users[chatId] = user;
  },
  
  getUser: (chatId) => {
    return testStorage.users[chatId] || null;
  },
  
  // Mock goal operations
  setGoals: (chatId, goals) => {
    testStorage.goals[chatId] = goals;
  },
  
  getGoals: (chatId) => {
    return testStorage.goals[chatId] || [];
  }
};

// Mock repository functions with in-memory storage
jest.mock('../common/userRepository', () => ({
  getUser: jest.fn(async (chatId) => {
    const user = testStorage.users[chatId];
    // Return null for non-existent users - let the service layer handle the logic
    return user || null;
  }),
  
  saveUser: jest.fn(async (user) => {
    testStorage.users[user.ChatId] = user;
    return user;
  }),
  
  getAllUsers: jest.fn(async () => {
    return Object.values(testStorage.users);
  }),
  
  getTicketCount: jest.fn(async (chatId) => {
    const user = testStorage.users[chatId];
    return user ? (user.Tickets || 0) : 0;
  }),
  
  addTicket: jest.fn(async (chatId, amount) => {
    const user = testStorage.users[chatId];
    if (user) {
      user.Tickets = (user.Tickets || 0) + amount;
    }
  }),
  
  setChatState: jest.fn(async () => {}),
  getChatState: jest.fn(async () => null),
  clearChatState: jest.fn(async () => {})
}));

jest.mock('../common/goalRepository', () => ({
  getGoals: jest.fn(async (chatId) => {
    return testStorage.goals[chatId] || [];
  }),
  
  updateGoals: jest.fn(async (chatId, goals) => {
    testStorage.goals[chatId] = goals;
  }),
  
  getAllGoals: jest.fn(async () => {
    const allGoals = [];
    for (const [chatId, goals] of Object.entries(testStorage.goals)) {
      allGoals.push(...goals.map(g => ({ ...g, chatId })));
    }
    return allGoals;
  })
}));

jest.mock('../common/rewardRepository', () => ({
  getRewards: jest.fn(async (chatId) => {
    return testStorage.rewards[chatId] || [];
  }),
  
  getReward: jest.fn(async (rewardId) => {
    for (const rewards of Object.values(testStorage.rewards)) {
      const reward = rewards.find(r => r.id === rewardId);
      if (reward) return reward;
    }
    return null;
  }),
  
  insertReward: jest.fn(async (reward) => {
    if (!testStorage.rewards[reward.ChatId]) {
      testStorage.rewards[reward.ChatId] = [];
    }
    testStorage.rewards[reward.ChatId].push(reward);
  }),
  
  updateReward: jest.fn(async (rewardId, updates) => {
    for (const rewards of Object.values(testStorage.rewards)) {
      const index = rewards.findIndex(r => r.id === rewardId);
      if (index !== -1) {
        rewards[index] = { ...rewards[index], ...updates };
        return;
      }
    }
  }),
  
  deleteReward: jest.fn(async (rewardId) => {
    for (const rewards of Object.values(testStorage.rewards)) {
      const index = rewards.findIndex(r => r.id === rewardId);
      if (index !== -1) {
        rewards.splice(index, 1);
        return;
      }
    }
  }),
  
  getAllRewards: jest.fn(async () => {
    const allRewards = [];
    for (const rewards of Object.values(testStorage.rewards)) {
      allRewards.push(...rewards);
    }
    return allRewards;
  })
}));

// Data persists within the same test suite for integration testing
// Each test file gets a fresh setup due to Jest's module isolation