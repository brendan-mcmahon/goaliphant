# API Centralization Migration Plan

## Overview
This plan outlines the migration strategy to centralize all data operations into the API, eliminating the need for other Lambda functions (bot, notifier, rollover) to have direct database access via the common folder.

## Architecture Vision

### Current Architecture
```
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐
│   Bot   │  │ Notifier │  │ Rollover │  │   API   │
└────┬────┘  └────┬─────┘  └────┬─────┘  └────┬────┘
     │            │              │              │
     └────────────┴──────────────┴──────────────┘
                         │
                    ┌────▼────┐
                    │ Common  │
                    │(copied) │
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │DynamoDB │
                    └─────────┘
```

### Target Architecture
```
┌─────────┐  ┌──────────┐  ┌──────────┐
│   Bot   │  │ Notifier │  │ Rollover │
└────┬────┘  └────┬─────┘  └────┬─────┘
     │            │              │
     └────────────┴──────────────┘
                  │
                  ▼
            ┌─────────┐
            │   API   │
            └────┬────┘
                 │
            ┌────▼─── ─┐
            │ Common   │
            │(internal)│
            └────┬──── ┘
                 │
            ┌────▼────┐
            │DynamoDB │
            └─────────┘
```

## Benefits of Centralization

1. **Single Source of Truth**: All data operations go through one service
2. **Simplified Deployment**: No need to copy common folder to multiple locations
3. **Easier Maintenance**: Business logic in one place
4. **Better Security**: Single point for access control and auditing
5. **Improved Scalability**: Can scale API independently
6. **Version Management**: API versioning protects clients from breaking changes
7. **Monitoring**: Centralized logging and metrics

## Phase 1: API Absorption of Common Layer
**Timeline: Week 1-2**
**Priority: Critical**

### 1.1 Move Common into API
```bash
# Move common folder into API
api/
├── index.js
├── common/  # Move here, no longer copied
│   ├── configs.js
│   ├── cronUtils.js
│   ├── goalRepository.js
│   ├── honeyRepository.js
│   ├── repository.js
│   ├── rewardRepository.js
│   ├── userRepository.js
│   └── utilities.js
├── services/  # New service layer
├── routes/    # RESTful routes
└── package.json
```

### 1.2 Update API Internal References
Change all imports from `./common/` to actual paths since common is now internal:
```javascript
// Before (when common was copied)
const { getGoals } = require('./common/goalRepository.js');

// After (common is part of API)
const { getGoals } = require('./common/goalRepository.js');  // No change needed!
```

### 1.3 Create Service Layer
Build services that wrap repository operations with business logic:

```javascript
// api/services/goalService.js
const { getGoals, updateGoals } = require('../common/goalRepository');
const { getUser } = require('../common/userRepository');
const { shouldShowRecurringGoalToday } = require('../common/cronUtils');
const { isScheduledDateInTheFuture } = require('../common/utilities');

class GoalService {
  async addGoal(chatId, text, options = {}) {
    const goals = await getGoals(chatId);
    const newGoal = {
      text,
      completed: false,
      createdAt: new Date().toISOString(),
      ...options
    };
    
    if (options.isHoney) {
      const user = await getUser(chatId);
      if (user.Partner) {
        // Add to partner's list as honey-do
        const partnerGoals = await getGoals(user.Partner);
        partnerGoals.push({ ...newGoal, isHoney: true, fromPartner: chatId });
        await updateGoals(user.Partner, partnerGoals);
      }
    } else {
      goals.push(newGoal);
      await updateGoals(chatId, goals);
    }
    
    return newGoal;
  }
  
  async listGoalsForToday(chatId, options = {}) {
    const goals = await getGoals(chatId);
    const today = new Date();
    
    return goals.filter(goal => {
      // Check if scheduled for future
      if (goal.scheduledDate && isScheduledDateInTheFuture(goal.scheduledDate)) {
        return false;
      }
      
      // Check recurring goals
      if (goal.recurring && !shouldShowRecurringGoalToday(goal.recurring)) {
        return false;
      }
      
      return true;
    });
  }
  
  // ... other methods
}

module.exports = new GoalService();
```

## Phase 2: Comprehensive API Endpoints
**Timeline: Week 2-3**
**Priority: Critical**

### 2.1 Goal Management Endpoints
```yaml
# Goals API
POST   /api/v1/goals                    # Add goal
POST   /api/v1/goals/batch              # Add multiple goals
GET    /api/v1/goals                    # List goals (with filters)
GET    /api/v1/goals/:id                # Get specific goal
PUT    /api/v1/goals/:id                # Update goal
DELETE /api/v1/goals/:id                # Delete goal
POST   /api/v1/goals/:id/complete       # Complete goal
DELETE /api/v1/goals/:id/complete       # Uncomplete goal
PUT    /api/v1/goals/:id/position       # Move goal
POST   /api/v1/goals/:id/schedule       # Schedule goal
DELETE /api/v1/goals/:id/schedule       # Unschedule goal
POST   /api/v1/goals/:id/recurring      # Make recurring
DELETE /api/v1/goals/:id/recurring      # Remove recurring
POST   /api/v1/goals/:id/notes          # Add note
PUT    /api/v1/goals/swap               # Swap two goals
GET    /api/v1/goals/partner            # Get partner's goals
POST   /api/v1/goals/honey              # Add honey-do task
```

### 2.2 Reward System Endpoints
```yaml
# Rewards API
POST   /api/v1/rewards                  # Create reward
GET    /api/v1/rewards                  # List rewards
GET    /api/v1/rewards/:id              # Get reward
PUT    /api/v1/rewards/:id              # Update reward
DELETE /api/v1/rewards/:id              # Delete reward
POST   /api/v1/rewards/:id/redeem       # Redeem reward
POST   /api/v1/rewards/request          # Request reward from partner
PUT    /api/v1/rewards/request/:id      # Approve/reject request
```

### 2.3 User Management Endpoints
```yaml
# Users API
POST   /api/v1/users                    # Create user
GET    /api/v1/users/:chatId            # Get user
PUT    /api/v1/users/:chatId            # Update user
GET    /api/v1/users/:chatId/tickets    # Get ticket balance
POST   /api/v1/users/:chatId/tickets    # Add/deduct tickets
POST   /api/v1/users/:chatId/partner    # Link partner
DELETE /api/v1/users/:chatId/partner    # Unlink partner
GET    /api/v1/users/:chatId/chat       # Get chat history
PUT    /api/v1/users/:chatId/chat       # Update chat history
DELETE /api/v1/users/:chatId/chat       # Clear chat history
```

### 2.4 System Operations Endpoints (for notifier, rollover)
```yaml
# System API
POST   /api/v1/system/rollover          # Trigger daily rollover
GET    /api/v1/system/rollover/status   # Get rollover status
POST   /api/v1/system/notifications     # Send notifications
GET    /api/v1/system/notifications/pending # Get pending notifications
POST   /api/v1/system/recurring/process # Process recurring goals
GET    /api/v1/system/stats             # Get system statistics
```

### 2.5 AI Integration Endpoints
```yaml
# AI API
POST   /api/v1/ai/process               # Process natural language
POST   /api/v1/ai/suggest               # Get suggestions
DELETE /api/v1/ai/context/:chatId       # Clear context
```

## Phase 3: Notifier Lambda Migration
**Timeline: Week 3**
**Priority: High**

### 3.1 Current Notifier Analysis
```javascript
// Current: Direct database access
const { getUsers, getGoals } = require('./common/userRepository');

// After: API calls
const apiClient = require('./services/apiClient');
```

### 3.2 Create Notifier API Client
```javascript
// notifier/services/apiClient.js
const axios = require('axios');

class NotifierApiClient {
  constructor(apiUrl, apiKey) {
    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'X-API-Key': apiKey,
        'X-Client': 'notifier-lambda'
      }
    });
  }
  
  async getPendingNotifications() {
    const response = await this.client.get('/api/v1/system/notifications/pending');
    return response.data;
  }
  
  async sendNotification(userId, message, type) {
    const response = await this.client.post('/api/v1/system/notifications', {
      userId,
      message,
      type,
      timestamp: new Date().toISOString()
    });
    return response.data;
  }
  
  async getUsersForDailyReminder() {
    const response = await this.client.get('/api/v1/users', {
      params: {
        hasIncompleteGoals: true,
        notificationsEnabled: true
      }
    });
    return response.data;
  }
}

module.exports = NotifierApiClient;
```

### 3.3 Refactor Notifier Handler
```javascript
// notifier/index.js
const NotifierApiClient = require('./services/apiClient');
const TelegramBot = require('node-telegram-bot-api');

const apiClient = new NotifierApiClient(
  process.env.API_URL,
  process.env.API_KEY
);

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

exports.handler = async (event) => {
  try {
    // Get users who need notifications
    const users = await apiClient.getUsersForDailyReminder();
    
    for (const user of users) {
      // Get user's incomplete goals
      const goals = await apiClient.getUserGoals(user.chatId, {
        completed: false,
        today: true
      });
      
      if (goals.length > 0) {
        const message = formatReminderMessage(goals);
        await bot.sendMessage(user.chatId, message);
        
        // Log notification
        await apiClient.sendNotification(user.chatId, message, 'daily_reminder');
      }
    }
    
    return { statusCode: 200, body: 'Notifications sent' };
  } catch (error) {
    console.error('Notification error:', error);
    return { statusCode: 500, body: 'Error sending notifications' };
  }
};
```

## Phase 4: Rollover Lambda Migration
**Timeline: Week 3-4**
**Priority: High**

### 4.1 Create Rollover API Client
```javascript
// rollover/services/apiClient.js
class RolloverApiClient {
  constructor(apiUrl, apiKey) {
    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'X-API-Key': apiKey,
        'X-Client': 'rollover-lambda'
      }
    });
  }
  
  async performRollover() {
    const response = await this.client.post('/api/v1/system/rollover');
    return response.data;
  }
  
  async getRolloverStatus() {
    const response = await this.client.get('/api/v1/system/rollover/status');
    return response.data;
  }
}
```

### 4.2 Implement Rollover Logic in API
```javascript
// api/services/rolloverService.js
class RolloverService {
  async performDailyRollover() {
    const users = await getAllUsers();
    const results = [];
    
    for (const user of users) {
      try {
        const goals = await getGoals(user.ChatId);
        const today = new Date();
        
        // Separate completed and incomplete goals
        const incompleteGoals = goals.filter(g => !g.completed && !g.scheduledDate);
        const completedGoals = goals.filter(g => g.completed);
        
        // Archive completed goals
        if (completedGoals.length > 0) {
          await this.archiveGoals(user.ChatId, completedGoals, today);
        }
        
        // Roll over incomplete goals
        if (incompleteGoals.length > 0) {
          await updateGoals(user.ChatId, incompleteGoals);
        }
        
        // Process recurring goals
        await this.processRecurringGoals(user.ChatId, goals);
        
        results.push({
          chatId: user.ChatId,
          status: 'success',
          rolled: incompleteGoals.length,
          archived: completedGoals.length
        });
      } catch (error) {
        results.push({
          chatId: user.ChatId,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  async processRecurringGoals(chatId, goals) {
    const recurringGoals = goals.filter(g => g.recurring);
    const today = new Date();
    
    for (const goal of recurringGoals) {
      if (shouldShowRecurringGoalToday(goal.recurring)) {
        // Create today's instance if it doesn't exist
        const todayInstance = {
          ...goal,
          recurring: undefined,
          parentId: goal.id,
          date: today.toISOString()
        };
        
        // Add to today's goals
        goals.push(todayInstance);
      }
    }
    
    await updateGoals(chatId, goals);
  }
}
```

## Phase 5: Bot Lambda Migration
**Timeline: Week 4-5**
**Priority: Critical**

### 5.1 Create Bot API Client
```javascript
// bot/services/apiClient.js
const axios = require('axios');

class BotApiClient {
  constructor(apiUrl, apiKey) {
    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'X-API-Key': apiKey,
        'X-Client': 'telegram-bot'
      },
      timeout: 5000
    });
    
    // Add retry logic
    this.client.interceptors.response.use(
      response => response,
      async error => {
        if (error.config && error.config.retry && error.config.retry < 3) {
          error.config.retry = (error.config.retry || 0) + 1;
          await this.delay(1000 * error.config.retry);
          return this.client(error.config);
        }
        throw error;
      }
    );
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Goal operations
  async addGoal(chatId, text, options = {}) {
    const response = await this.client.post('/api/v1/goals', {
      chatId,
      text,
      ...options
    });
    return response.data;
  }
  
  async getGoals(chatId, filters = {}) {
    const response = await this.client.get('/api/v1/goals', {
      params: { chatId, ...filters }
    });
    return response.data;
  }
  
  async completeGoal(chatId, goalId) {
    const response = await this.client.post(`/api/v1/goals/${goalId}/complete`, {
      chatId
    });
    return response.data;
  }
  
  // User operations
  async getUser(chatId) {
    const response = await this.client.get(`/api/v1/users/${chatId}`);
    return response.data;
  }
  
  async createUser(chatId, username) {
    const response = await this.client.post('/api/v1/users', {
      chatId,
      username
    });
    return response.data;
  }
  
  async getTicketBalance(chatId) {
    const response = await this.client.get(`/api/v1/users/${chatId}/tickets`);
    return response.data;
  }
  
  // Reward operations
  async getRewards(chatId) {
    const response = await this.client.get('/api/v1/rewards', {
      params: { chatId }
    });
    return response.data;
  }
  
  async redeemReward(chatId, rewardId) {
    const response = await this.client.post(`/api/v1/rewards/${rewardId}/redeem`, {
      chatId
    });
    return response.data;
  }
  
  // AI operations
  async processNaturalLanguage(chatId, message, context) {
    const response = await this.client.post('/api/v1/ai/process', {
      chatId,
      message,
      context
    });
    return response.data;
  }
}

module.exports = BotApiClient;
```

### 5.2 Refactor Bot Handlers
Example refactoring for addGoalsHandler:

```javascript
// bot/handlers/addGoalsHandler.js
const apiClient = require('../services/apiClient');

async function addGoal(bot, chatId, text) {
  try {
    const result = await apiClient.addGoal(chatId, text);
    
    // Format for Telegram
    const message = `✅ Goal added: ${result.text}`;
    bot.sendMessage(chatId, message);
    
    // Show updated list
    await listGoals(bot, chatId);
  } catch (error) {
    console.error('Error adding goal:', error);
    bot.sendMessage(chatId, '❌ Failed to add goal. Please try again.');
  }
}

async function addMultipleGoals(bot, chatId, goalsText) {
  const goals = goalsText.split('\n').filter(g => g.trim());
  
  try {
    const results = await apiClient.addGoalsBatch(chatId, goals);
    
    bot.sendMessage(chatId, `✅ Added ${results.length} goals`);
    await listGoals(bot, chatId);
  } catch (error) {
    console.error('Error adding goals:', error);
    bot.sendMessage(chatId, '❌ Failed to add goals. Please try again.');
  }
}

module.exports = { addGoal, addMultipleGoals };
```

## Phase 6: Security & Authentication
**Timeline: Week 5**
**Priority: Critical**

### 6.1 API Key Management
```javascript
// api/middleware/auth.js
const crypto = require('crypto');

class AuthMiddleware {
  constructor() {
    this.apiKeys = new Map([
      [process.env.BOT_API_KEY, { client: 'telegram-bot', permissions: ['*'] }],
      [process.env.NOTIFIER_API_KEY, { client: 'notifier', permissions: ['read', 'notify'] }],
      [process.env.ROLLOVER_API_KEY, { client: 'rollover', permissions: ['system'] }],
      [process.env.UI_API_KEY, { client: 'web-ui', permissions: ['*'] }]
    ]);
  }
  
  authenticate(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    const keyInfo = this.apiKeys.get(apiKey);
    if (!keyInfo) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    req.client = keyInfo;
    next();
  }
  
  authorize(permission) {
    return (req, res, next) => {
      if (!req.client.permissions.includes('*') && 
          !req.client.permissions.includes(permission)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
  }
}
```

### 6.2 User Context Validation
```javascript
// api/middleware/userContext.js
async function validateUserContext(req, res, next) {
  const chatId = req.params.chatId || req.body.chatId;
  
  if (!chatId) {
    return res.status(400).json({ error: 'chatId required' });
  }
  
  // Verify user exists
  try {
    const user = await getUser(chatId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to validate user' });
  }
}
```

## Phase 7: Deployment Strategy
**Timeline: Week 6**
**Priority: Critical**

### 7.1 Environment Configuration
```yaml
# API Lambda Environment
API_ENVIRONMENT: production
DYNAMODB_TABLE_PREFIX: goaliphant_
AWS_REGION: us-east-2
LOG_LEVEL: info
OPENAI_API_KEY: ${SSM:openai-api-key}

# Bot Lambda Environment  
API_URL: https://api.goaliphant.com
API_KEY: ${SSM:bot-api-key}
TELEGRAM_TOKEN: ${SSM:telegram-token}
LOG_LEVEL: info

# Notifier Lambda Environment
API_URL: https://api.goaliphant.com
API_KEY: ${SSM:notifier-api-key}
TELEGRAM_TOKEN: ${SSM:telegram-token}

# Rollover Lambda Environment
API_URL: https://api.goaliphant.com
API_KEY: ${SSM:rollover-api-key}
```

### 7.2 Gradual Migration Steps
```bash
# Step 1: Deploy new API with common absorbed
# - API contains all common code
# - Old lambdas still using copied common (backward compatible)

# Step 2: Deploy notifier using API
# - Switch notifier to API calls
# - Monitor for issues

# Step 3: Deploy rollover using API
# - Switch rollover to API calls
# - Monitor for issues

# Step 4: Deploy bot using API
# - Start with read operations
# - Gradually move write operations
# - Full cutover

# Step 5: Cleanup
# - Remove common folder from root
# - Remove copy steps from deployment
# - Update CI/CD pipelines
```

### 7.3 Rollback Plan
```javascript
// Feature flags in each Lambda
const USE_API = process.env.USE_API === 'true';

if (USE_API) {
  // Use API client
  const goals = await apiClient.getGoals(chatId);
} else {
  // Fall back to direct database access
  const { getGoals } = require('./common/goalRepository');
  const goals = await getGoals(chatId);
}
```

## Phase 8: Monitoring & Observability
**Timeline: Week 6**
**Priority: High**

### 8.1 API Metrics
```javascript
// api/middleware/metrics.js
const CloudWatch = require('aws-sdk/clients/cloudwatch');
const cloudwatch = new CloudWatch();

class MetricsMiddleware {
  async recordMetric(metricName, value, unit = 'Count') {
    await cloudwatch.putMetricData({
      Namespace: 'Goaliphant/API',
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date()
      }]
    }).promise();
  }
  
  middleware() {
    return async (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', async () => {
        const duration = Date.now() - start;
        
        // Record metrics
        await this.recordMetric('RequestCount', 1);
        await this.recordMetric('RequestDuration', duration, 'Milliseconds');
        await this.recordMetric(`Status${res.statusCode}`, 1);
        await this.recordMetric(`Client_${req.client?.client || 'unknown'}`, 1);
      });
      
      next();
    };
  }
}
```

### 8.2 Distributed Tracing
```javascript
// api/middleware/tracing.js
const { v4: uuidv4 } = require('uuid');

function tracingMiddleware(req, res, next) {
  // Get or create trace ID
  const traceId = req.headers['x-trace-id'] || uuidv4();
  
  // Attach to request and response
  req.traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);
  
  // Log with trace ID
  console.log({
    traceId,
    method: req.method,
    path: req.path,
    client: req.client?.client,
    timestamp: new Date().toISOString()
  });
  
  next();
}
```

## Success Criteria

### Technical Metrics
- [ ] API response time < 200ms (p95)
- [ ] Zero data loss during migration
- [ ] 99.9% uptime maintained
- [ ] All Lambda functions using API
- [ ] Common folder eliminated from deployment

### Functional Requirements
- [ ] All bot commands working via API
- [ ] Notifications sent successfully
- [ ] Daily rollover functioning
- [ ] Recurring goals processed correctly
- [ ] Partner features operational

### Operational Improvements
- [ ] Centralized monitoring dashboard
- [ ] Unified error tracking
- [ ] Single deployment pipeline for data layer
- [ ] Reduced Lambda package sizes
- [ ] Simplified local development

## Timeline Summary

| Week | Focus              | Deliverables                                   |
| ---- | ------------------ | ---------------------------------------------- |
| 1-2  | API Foundation     | Common absorbed, service layer, core endpoints |
| 3    | Notifier Migration | Notifier using API, monitoring                 |
| 3-4  | Rollover Migration | Rollover using API, system endpoints           |
| 4-5  | Bot Migration      | Bot using API, all handlers refactored         |
| 5    | Security           | Authentication, authorization, rate limiting   |
| 6    | Deployment         | Production rollout, monitoring, documentation  |

## Risk Mitigation

### Identified Risks
1. **Performance degradation**: Mitigate with caching, connection pooling
2. **API downtime affects all services**: Implement circuit breakers, retries
3. **Migration bugs**: Extensive testing, gradual rollout
4. **Security vulnerabilities**: Security audit, penetration testing
5. **Rollback complexity**: Feature flags, dual-mode operation

### Monitoring During Migration
- CloudWatch dashboards for each Lambda
- API Gateway metrics
- DynamoDB metrics
- Error rate monitoring
- Latency tracking
- Cost analysis

## Next Steps

1. **Week 1 Priorities**:
   - Set up API project structure
   - Move common folder into API
   - Create first service (goalService)
   - Implement 5 core endpoints
   - Set up test environment

2. **Pre-Migration Checklist**:
   - [ ] Backup all DynamoDB tables
   - [ ] Document current API usage
   - [ ] Set up monitoring dashboards
   - [ ] Create runbooks for rollback
   - [ ] Notify stakeholders of timeline

3. **Post-Migration Cleanup**:
   - Remove common folder from root
   - Update CI/CD pipelines
   - Archive old deployment scripts
   - Update documentation
   - Optimize API performance

This centralized architecture will significantly simplify your system, improve maintainability, and provide a solid foundation for future growth.