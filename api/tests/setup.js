// Jest setup for API tests - mocks AWS services

const mockDocumentClient = {
  get: jest.fn().mockReturnValue({ promise: () => Promise.resolve({ Item: null }) }),
  put: jest.fn().mockReturnValue({ promise: () => Promise.resolve({}) }),
  update: jest.fn().mockReturnValue({ promise: () => Promise.resolve({}) }),
  delete: jest.fn().mockReturnValue({ promise: () => Promise.resolve({}) }),
  query: jest.fn().mockReturnValue({ promise: () => Promise.resolve({ Items: [] }) }),
  scan: jest.fn().mockReturnValue({ promise: () => Promise.resolve({ Items: [] }) })
};

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
  goals: {},  // { [chatId]: { [goalId]: goalObject } }
  rewards: {}
};

global.testHelpers = {
  resetStorage: () => {
    testStorage.users = {};
    testStorage.goals = {};
    testStorage.rewards = {};
  },
  getStorage: () => testStorage,
  setUser: (chatId, user) => { testStorage.users[chatId] = user; },
  getUser: (chatId) => testStorage.users[chatId] || null,
  setGoals: (chatId, goals) => {
    testStorage.goals[chatId] = {};
    goals.forEach(g => { testStorage.goals[chatId][g.goalId] = g; });
  },
  getGoals: (chatId) => Object.values(testStorage.goals[chatId] || {})
};

jest.mock('../common/userRepository', () => ({
  getUser: jest.fn(async (chatId) => testStorage.users[chatId] || null),

  saveUser: jest.fn(async (user) => {
    testStorage.users[user.ChatId] = user;
    return user;
  }),

  getAllUsers: jest.fn(async () => Object.values(testStorage.users)),

  getTicketCount: jest.fn(async (chatId) => {
    const user = testStorage.users[chatId];
    return user ? (user.Tickets || 0) : 0;
  }),

  addTicket: jest.fn(async (chatId, amount) => {
    const user = testStorage.users[chatId];
    if (user) user.Tickets = (user.Tickets || 0) + (amount ?? 1);
  }),

  addTickets: jest.fn(async (chatId, amount) => {
    const user = testStorage.users[chatId];
    if (user) user.Tickets = (user.Tickets || 0) + amount;
  }),

  deductTickets: jest.fn(async (chatId, amount) => {
    const user = testStorage.users[chatId];
    if (user) user.Tickets = Math.max(0, (user.Tickets || 0) - amount);
  }),

  setChatState: jest.fn(async () => {}),
  getChatState: jest.fn(async () => null),
  clearChatState: jest.fn(async () => {})
}));

jest.mock('../common/goalRepository', () => {
  const { randomUUID } = require('crypto');

  return {
    getGoals: jest.fn(async (chatId) => {
      const all = Object.values(testStorage.goals[chatId] || {});
      return all
        .filter(g => g.status === 'active')
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }),

    addGoal: jest.fn(async (chatId, goalData) => {
      if (!testStorage.goals[chatId]) testStorage.goals[chatId] = {};
      const existing = Object.values(testStorage.goals[chatId]).filter(g => g.status === 'active');
      const maxOrder = existing.length > 0 ? Math.max(...existing.map(g => g.displayOrder || 0)) : 0;
      const goal = {
        chatId: chatId.toString(),
        goalId: randomUUID(),
        status: 'active',
        completed: false,
        displayOrder: maxOrder + 1,
        createdAt: new Date().toISOString(),
        ...goalData
      };
      testStorage.goals[chatId][goal.goalId] = goal;
      return goal;
    }),

    updateGoal: jest.fn(async (chatId, goalId, updates) => {
      if (!testStorage.goals[chatId] || !testStorage.goals[chatId][goalId]) return;
      const goal = testStorage.goals[chatId][goalId];
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined) {
          delete goal[key];
        } else {
          goal[key] = value;
        }
      }
    }),

    deleteGoal: jest.fn(async (chatId, goalId) => {
      if (testStorage.goals[chatId]) {
        delete testStorage.goals[chatId][goalId];
      }
    }),

    deleteAllGoalsForUser: jest.fn(async (chatId) => {
      const count = Object.keys(testStorage.goals[chatId] || {}).length;
      testStorage.goals[chatId] = {};
      return count;
    }),

    getGoalsCompletedToday: jest.fn(async (chatId) => {
      const today = new Date().toISOString().split('T')[0];
      return Object.values(testStorage.goals[chatId] || {}).filter(g => {
        const ts = g.isRecurring ? g.lastCompletedAt : g.completedAt;
        return ts && ts.startsWith(today);
      });
    })
  };
});

jest.mock('../common/rewardRepository', () => ({
  getRewards: jest.fn(async (chatId) => testStorage.rewards[chatId] || []),

  getReward: jest.fn(async (rewardId) => {
    for (const rewards of Object.values(testStorage.rewards)) {
      const reward = rewards.find(r => r.id === rewardId);
      if (reward) return reward;
    }
    return null;
  }),

  insertReward: jest.fn(async (reward) => {
    if (!testStorage.rewards[reward.ChatId]) testStorage.rewards[reward.ChatId] = [];
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
      if (index !== -1) { rewards.splice(index, 1); return; }
    }
  }),

  getAllRewards: jest.fn(async () => {
    return Object.values(testStorage.rewards).flat();
  })
}));
