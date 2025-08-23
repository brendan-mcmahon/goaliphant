# API-Bot Parity Migration Plan

## Overview
This plan outlines the migration strategy to achieve feature parity between the API and Bot components of Goaliphant, while maintaining the current deployment architecture where the `common` folder is copied into each directory during deployment.

## Current Architecture
- **Bot**: Full-featured Telegram bot with 20+ handlers
- **API**: Limited functionality (6 endpoints)
- **Common**: Shared repository layer copied to both during deployment
- **Deployment**: Common folder is copied into api/ and bot/ directories (maintaining `./common/` references)

## Migration Goals
1. Achieve full feature parity between API and Bot
2. Maintain bot as pure Telegram interface layer
3. Create comprehensive REST API for all business operations
4. Preserve current deployment process
5. Enable future third-party integrations

## Phase 1: API Service Layer Creation
**Timeline: Week 1-2**
**Priority: High**

Create service modules in the API that encapsulate business logic:

### 1.1 Goal Service (`api/services/goalService.js`)
```javascript
// Core operations currently in bot handlers
- addGoal(chatId, text, isHoney)
- addMultipleGoals(chatId, goals)
- editGoal(chatId, index, text)
- deleteGoal(chatId, index)
- deleteMultipleGoals(chatId, indices)
- completeGoal(chatId, index)
- completeMultipleGoals(chatId, indices)
- uncompleteGoal(chatId, index)
- uncompleteMultipleGoals(chatId, indices)
- moveGoal(chatId, fromIndex, toIndex)
- swapGoals(chatId, index1, index2)
- scheduleGoal(chatId, index, date)
- unscheduleGoal(chatId, index)
- addNoteToGoal(chatId, index, note)
- makeGoalRecurring(chatId, index, cronExpression)
- listGoals(chatId, options)
- listPartnerGoals(chatId)
```

### 1.2 Reward Service (`api/services/rewardService.js`)
```javascript
// Reward management operations
- createReward(chatId, reward)
- updateReward(rewardId, updates)
- deleteReward(rewardId)
- listRewards(chatId)
- requestReward(requesterId, recipientId, request)
- approveRewardRequest(rewardId, cost)
- rejectRewardRequest(rewardId)
- redeemReward(chatId, rewardId)
```

### 1.3 User Service (`api/services/userService.js`)
```javascript
// User and ticket management
- createUser(chatId, username)
- getUser(chatId)
- linkPartner(chatId1, chatId2)
- unlinkPartner(chatId)
- getTicketBalance(chatId)
- addTickets(chatId, amount)
- deductTickets(chatId, amount)
- getChatHistory(chatId)
- updateChatHistory(chatId, messages)
- clearChatHistory(chatId)
```

### 1.4 AI Service (`api/services/aiService.js`)
```javascript
// Natural language processing
- processNaturalLanguage(chatId, message)
- generateGoalSuggestions(chatId, context)
- clearAIContext(chatId)
```

### 1.5 Notification Service (`api/services/notificationService.js`)
```javascript
// Cross-user notifications
- notifyPartner(chatId, message)
- sendRewardRequest(fromId, toId, reward)
- sendCompletionNotification(chatId, goals)
```

## Phase 2: API Endpoint Implementation
**Timeline: Week 2-3**
**Priority: High**

### 2.1 Update existing endpoints to use service layer
- `/getAllData` → Use services
- `/completeGoal` → Use goalService
- `/uncompleteGoal` → Use goalService
- `/addGoal` → Use goalService
- `/editGoal` → Use goalService
- `/deleteGoal` → Use goalService
- `/getUserData` → Use userService

### 2.2 Add new REST endpoints

#### Goal Endpoints
```
POST   /api/goals/add-multiple
POST   /api/goals/complete-multiple
POST   /api/goals/uncomplete-multiple
POST   /api/goals/delete-multiple
PUT    /api/goals/move
PUT    /api/goals/swap
PUT    /api/goals/schedule
DELETE /api/goals/schedule
POST   /api/goals/note
PUT    /api/goals/recurring
GET    /api/goals/list
GET    /api/goals/partner
```

#### Reward Endpoints
```
POST   /api/rewards/create
PUT    /api/rewards/:id
DELETE /api/rewards/:id
GET    /api/rewards/list
POST   /api/rewards/request
PUT    /api/rewards/request/:id/approve
PUT    /api/rewards/request/:id/reject
POST   /api/rewards/redeem
```

#### User Endpoints
```
POST   /api/users/create
GET    /api/users/:chatId
POST   /api/users/link-partner
DELETE /api/users/link-partner
GET    /api/users/:chatId/tickets
POST   /api/users/:chatId/tickets/add
POST   /api/users/:chatId/tickets/deduct
```

#### AI Endpoints
```
POST   /api/ai/process
POST   /api/ai/suggest
DELETE /api/ai/context/:chatId
```

## Phase 3: Bot Handler Refactoring
**Timeline: Week 3-4**
**Priority: Medium**

### 3.1 Create API Client (`bot/services/apiClient.js`)
```javascript
// Centralized API communication
class ApiClient {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }
  
  // Methods for each API endpoint
  async addGoal(chatId, text) { ... }
  async completeGoal(chatId, index) { ... }
  // ... etc
}
```

### 3.2 Refactor handlers to use API Client
Each handler should:
1. Keep Telegram-specific logic (keyboards, formatting, chat states)
2. Delegate business logic to API via apiClient
3. Handle API responses and format for Telegram

Example refactoring for `addGoalsHandler.js`:
```javascript
// Before: Direct repository access
const { getGoals, updateGoals } = require('./common/goalRepository.js');

// After: API client usage
const apiClient = require('../services/apiClient.js');

async function addGoal(chatId, text) {
  try {
    await apiClient.addGoal(chatId, text);
    // Handle Telegram-specific formatting
  } catch (error) {
    // Handle errors
  }
}
```

### 3.3 Maintain backward compatibility
- Keep common folder references working
- Gradual migration per handler
- Test each handler after refactoring

## Phase 4: Configuration & Environment
**Timeline: Week 4**
**Priority: High**

### 4.1 Environment Variables
Add to both API and Bot:
```env
# API Configuration
API_URL=https://your-api-endpoint
API_KEY=your-api-key

# Bot Configuration  
BOT_MODE=api|direct  # Toggle between API and direct DB access

# Shared
AWS_REGION=us-east-2
DYNAMODB_TABLE_PREFIX=goaliphant_
```

### 4.2 Configuration Management
Create `api/config/index.js` and `bot/config/index.js`:
```javascript
module.exports = {
  api: {
    url: process.env.API_URL,
    key: process.env.API_KEY
  },
  bot: {
    mode: process.env.BOT_MODE || 'direct',
    token: process.env.TELEGRAM_TOKEN
  },
  aws: {
    region: process.env.AWS_REGION
  }
};
```

## Phase 5: Authentication & Security
**Timeline: Week 5**
**Priority: High**

### 5.1 API Authentication
```javascript
// API Key middleware
function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// User authentication
function authenticateUser(req, res, next) {
  const chatId = req.headers['x-chat-id'];
  const token = req.headers['x-auth-token'];
  // Validate user token
  next();
}
```

### 5.2 Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### 5.3 Input Validation
```javascript
const { body, param, query, validationResult } = require('express-validator');

// Example validation for adding goal
app.post('/api/goals/add',
  body('chatId').isNumeric(),
  body('text').isLength({ min: 1, max: 500 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process request
  }
);
```

## Phase 6: Testing Strategy
**Timeline: Week 5-6**
**Priority: High**

### 6.1 Unit Tests
- Test each service method independently
- Mock repository calls
- Test error handling

### 6.2 Integration Tests
- Test API endpoints end-to-end
- Test bot-to-API communication
- Test database operations

### 6.3 Test Structure
```
tests/
├── unit/
│   ├── services/
│   │   ├── goalService.test.js
│   │   ├── rewardService.test.js
│   │   └── userService.test.js
│   └── handlers/
│       └── *.test.js
├── integration/
│   ├── api/
│   │   └── endpoints.test.js
│   └── bot/
│       └── apiClient.test.js
└── fixtures/
    └── testData.js
```

## Phase 7: Documentation
**Timeline: Week 6**
**Priority: Medium**

### 7.1 Update OpenAPI Specification
- Document all new endpoints
- Include request/response schemas
- Add authentication requirements
- Generate API documentation

### 7.2 Developer Documentation
- API integration guide
- Bot customization guide
- Deployment instructions
- Environment setup

### 7.3 Migration Guide
- Step-by-step migration instructions
- Rollback procedures
- Troubleshooting guide

## Deployment Considerations

### Maintain Current Deployment Process
1. **No changes to build process**: Common folder continues to be copied
2. **Gradual rollout**: Use feature flags to toggle between direct and API modes
3. **Backward compatibility**: Bot can work in both modes during transition

### Deployment Steps
```bash
# Current process (unchanged)
1. Copy common/ → api/common/
2. Copy common/ → bot/common/
3. Deploy API Lambda
4. Deploy Bot Lambda

# New configuration
5. Set BOT_MODE=direct (initially)
6. Test API endpoints
7. Gradually switch handlers to BOT_MODE=api
8. Full cutover when stable
```

## Risk Mitigation

### Potential Risks & Mitigations
1. **Deployment breaks**: Keep current process, test thoroughly
2. **Performance degradation**: Implement caching, connection pooling
3. **API failures**: Implement retry logic, circuit breakers
4. **Data inconsistency**: Use transactions where needed
5. **Security vulnerabilities**: Regular security audits, penetration testing

### Rollback Strategy
1. Feature flags allow instant rollback to direct mode
2. Keep old handler code during transition
3. Database schema remains unchanged
4. API versioning for breaking changes

## Success Metrics

### Phase Completion Criteria
- [ ] All business logic extracted to services
- [ ] All endpoints implemented and tested
- [ ] Bot successfully using API for all operations
- [ ] Zero downtime during migration
- [ ] Performance metrics within acceptable range
- [ ] Security audit passed
- [ ] Documentation complete

### Performance Targets
- API response time < 200ms for simple operations
- API response time < 500ms for complex operations
- 99.9% uptime
- Support for 1000+ concurrent users

## Timeline Summary

| Phase | Duration | Dependencies | Priority |
|-------|----------|--------------|----------|
| Phase 1: Service Layer | Week 1-2 | None | High |
| Phase 2: API Endpoints | Week 2-3 | Phase 1 | High |
| Phase 3: Bot Refactoring | Week 3-4 | Phase 2 | Medium |
| Phase 4: Configuration | Week 4 | Phase 2 | High |
| Phase 5: Security | Week 5 | Phase 2 | High |
| Phase 6: Testing | Week 5-6 | All phases | High |
| Phase 7: Documentation | Week 6 | All phases | Medium |

## Next Steps

1. **Immediate Actions**:
   - Create service layer structure in API
   - Set up test environment
   - Create feature flags for gradual rollout

2. **Week 1 Goals**:
   - Implement goalService.js
   - Create first 5 new API endpoints
   - Write unit tests for goalService

3. **Communication**:
   - Weekly progress updates
   - Blockers and risks discussion
   - Performance metrics review

## Appendix: File Structure After Migration

```
goaliphant/
├── api/
│   ├── index.js
│   ├── services/
│   │   ├── goalService.js
│   │   ├── rewardService.js
│   │   ├── userService.js
│   │   ├── aiService.js
│   │   └── notificationService.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── rateLimit.js
│   ├── routes/
│   │   ├── goals.js
│   │   ├── rewards.js
│   │   ├── users.js
│   │   └── ai.js
│   ├── config/
│   │   └── index.js
│   ├── common/  (copied during deployment)
│   └── package.json
├── bot/
│   ├── index.js
│   ├── bot.js
│   ├── handlers/
│   │   └── [existing handlers, refactored]
│   ├── services/
│   │   └── apiClient.js
│   ├── config/
│   │   └── index.js
│   ├── common/  (copied during deployment)
│   └── package.json
├── common/  (source, copied to api/ and bot/)
│   ├── goalRepository.js
│   ├── rewardRepository.js
│   ├── userRepository.js
│   └── [other shared code]
└── tests/
    └── [test structure as outlined]
```

This migration plan ensures that the API and Bot achieve parity while maintaining the current deployment architecture and providing a clear path forward for future enhancements.