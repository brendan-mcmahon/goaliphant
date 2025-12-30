# DynamoDB to Supabase Migration Plan

## Overview

Migrate Goaliphant from DynamoDB to Supabase to eliminate the nightly data duplication problem. Currently, the rollover function copies incomplete goals to new daily records, causing O(n) duplication over time. With Supabase, goals become static records with status fields, and "today's goals" is just a SQL query.

**Approach:** Direct cutover, ignore historical data, keep index-based bot commands, **eliminate rollover entirely**.

---

## Phase 1: Supabase Setup

### 1.1 Create Supabase Project
- Create project at supabase.com
- Note the project URL and service role key
- Add environment variables to Lambda configs

### 1.2 Create Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id TEXT UNIQUE NOT NULL,
    username TEXT,
    ticket_wallet INTEGER DEFAULT 0,
    partner_id UUID REFERENCES users(id),
    notifications_enabled BOOLEAN DEFAULT true,
    chat_state TEXT DEFAULT 'chat',
    chat_state_args JSONB,
    chat_state_datetime TIMESTAMPTZ,
    chat_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Goals table (single records, no rollover needed)
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'archived')),

    -- For one-time goals
    completed_at TIMESTAMPTZ,

    -- For recurring goals (single record, resets daily via query logic)
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern TEXT,              -- 'W:1:Mon-Wed-Fri' format
    last_completed_at TIMESTAMPTZ,        -- When last completed (for daily reset)

    -- Scheduling
    scheduled_date DATE,                  -- Future-dated goals
    due_date DATE,

    -- Partner system
    is_honey BOOLEAN DEFAULT false,
    from_partner_id UUID REFERENCES users(id),

    -- Metadata
    notes JSONB DEFAULT '[]'::jsonb,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rewards table
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    cost INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'redeemed', 'pending', 'approved', 'rejected')),
    type TEXT DEFAULT 'standard' CHECK (type IN ('standard', 'request')),
    requester_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    redeemed_at TIMESTAMPTZ
);

-- Honey-do table
CREATE TABLE honey_do (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_to_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by_id UUID NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_users_chat_id ON users(chat_id);
CREATE INDEX idx_goals_user_status ON goals(user_id, status);
CREATE INDEX idx_goals_user_active ON goals(user_id) WHERE status = 'active';
CREATE INDEX idx_goals_display_order ON goals(user_id, display_order);
CREATE INDEX idx_goals_recurring ON goals(user_id) WHERE is_recurring = true;
CREATE INDEX idx_rewards_user_status ON rewards(user_id, status);
CREATE INDEX idx_honey_do_assigned ON honey_do(assigned_to_id, completed);
```

---

## Phase 2: Repository Layer

### 2.1 Create Supabase Client
**New file:** `common/supabase.js`
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);
module.exports = supabase;
```

### 2.2 Rewrite Repository Files

| File | Key Changes |
|------|-------------|
| `common/goalRepository.js` | Query by user_id + status, use display_order for indices |
| `common/userRepository.js` | Query by chat_id, handle partner_id as UUID |
| `common/rewardRepository.js` | Query by user_id, use UUID reward IDs |
| `common/honeyRepository.js` | Query by assigned_to_id |

### 2.3 Key Query Patterns

**Get today's active goals (replaces daily record lookup):**
```javascript
async function getGoals(chatId) {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .or(`scheduled_date.is.null,scheduled_date.lte.${today}`)
        .order('display_order');

    return data;
}
```

**Complete a goal (status update, not copy):**
```javascript
async function completeGoal(goalId) {
    return await supabase
        .from('goals')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .eq('id', goalId);
}
```

---

## Phase 3: Eliminate Rollover (Query Logic Only)

### 3.1 No Rollover Lambda Needed!

With Supabase, **all rollover logic is replaced by smart queries**. No nightly job required.

### 3.2 How Each Goal Type Works

**One-time goals:**
- Single record with `is_recurring = false`
- Shows until `status = 'completed'`
- Completing sets `completed_at` and `status = 'completed'`

**Recurring goals:**
- Single record with `is_recurring = true` and `recurrence_pattern`
- Shows if: pattern matches today AND (`last_completed_at` is null OR before today)
- Completing sets `last_completed_at = now()` (NOT status!)
- Next matching day: shows again because `last_completed_at` < today

**Scheduled goals:**
- Single record with `scheduled_date` set
- Shows only when `scheduled_date <= today`
- Otherwise same as one-time goals

### 3.3 The Master Query

```javascript
async function getTodaysGoals(userId) {
    const today = new Date().toISOString().split('T')[0];

    const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .or(`scheduled_date.is.null,scheduled_date.lte.${today}`)
        .order('display_order');

    // Filter recurring goals in app (cron logic too complex for SQL)
    return goals.filter(goal => {
        if (!goal.is_recurring) return true;

        // Check if pattern matches today
        if (!matchesRecurrence(new Date(), goal.recurrence_pattern)) {
            return false;
        }

        // Check if already completed today
        if (goal.last_completed_at) {
            const lastCompleted = new Date(goal.last_completed_at)
                .toISOString().split('T')[0];
            if (lastCompleted === today) return false;
        }

        return true;
    });
}
```

### 3.4 Complete a Goal

```javascript
async function completeGoal(goalId) {
    const { data: goal } = await supabase
        .from('goals')
        .select('is_recurring')
        .eq('id', goalId)
        .single();

    if (goal.is_recurring) {
        // Recurring: just update last_completed_at (will show again next match)
        return supabase
            .from('goals')
            .update({ last_completed_at: new Date().toISOString() })
            .eq('id', goalId);
    } else {
        // One-time: mark as completed permanently
        return supabase
            .from('goals')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', goalId);
    }
}
```

### 3.5 Delete Rollover Lambda
- Remove `rollover/` directory entirely
- Remove GitHub Actions workflow `deploy-rollover.yml`
- Remove EventBridge scheduled rule

---

## Phase 4: Service Layer Updates

### 4.1 Goal Service Changes
**File:** `api/services/goalService.js`

- Change from array-index operations to UUID-based
- Map display_order to user-facing indices
- Update add/edit/delete/complete/swap/move operations

### 4.2 Index Mapping Pattern
```javascript
// Convert user's 1-based index to goal ID
async function getGoalByIndex(userId, index) {
    const { data } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('display_order')
        .range(index - 1, index - 1);

    return data?.[0];
}

// Reorder after delete
async function reorderGoals(userId) {
    const { data: goals } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('display_order');

    for (let i = 0; i < goals.length; i++) {
        await supabase
            .from('goals')
            .update({ display_order: i + 1 })
            .eq('id', goals[i].id);
    }
}
```

---

## Phase 5: Bot Handler Updates

### 5.1 Files to Update
All handlers in `bot/handlers/` that work with goals:
- `addHandler.js` - Insert with next display_order
- `completeHandler.js` - Update status by index lookup
- `deleteHandler.js` - Delete by ID, reorder remaining
- `editHandler.js` - Update by ID
- `listHandler.js` - Query active goals, format with display_order
- `swapHandler.js` - Swap display_order values
- `moveHandler.js` - Update display_order
- `noteHandler.js` - Append to notes JSONB
- `detailsHandler.js` - Query single goal by index
- `scheduleHandler.js` - Set scheduled_date
- `recurringHandler.js` - Set is_recurring + recurrence_pattern

---

## Phase 6: Data Migration Script

### 6.1 One-Time Migration
Run once before cutover:

```javascript
async function migrate() {
    // 1. Migrate users
    const users = await dynamoGetAllUsers();
    for (const user of users) {
        await supabase.from('users').insert({
            chat_id: user.ChatId,
            username: user.Name,
            ticket_wallet: user.TicketWallet || 0,
            notifications_enabled: user.notificationsEnabled ?? true,
            chat_state: user.ChatState || 'chat',
            chat_state_args: user.ChatStateArgs,
            chat_history: user.chatHistory || []
        });
    }

    // 2. Link partners
    for (const user of users) {
        if (user.Partner) {
            const { data: partner } = await supabase
                .from('users')
                .select('id')
                .eq('chat_id', user.Partner)
                .single();

            if (partner) {
                await supabase
                    .from('users')
                    .update({ partner_id: partner.id })
                    .eq('chat_id', user.ChatId);
            }
        }
    }

    // 3. Migrate current goals (deduplicated)
    // Only take the most recent day's goals for each user
    const goalRecords = await dynamoGetAllGoals();
    const latestByUser = new Map();

    for (const record of goalRecords) {
        const existing = latestByUser.get(record.chatId);
        if (!existing || record.date > existing.date) {
            latestByUser.set(record.chatId, record);
        }
    }

    for (const [chatId, record] of latestByUser) {
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('chat_id', chatId)
            .single();

        if (!user) continue;

        for (let i = 0; i < record.goals.length; i++) {
            const goal = record.goals[i];
            await supabase.from('goals').insert({
                user_id: user.id,
                text: goal.text,
                status: goal.completed ? 'completed' : 'active',
                completed_at: goal.completedAt,
                scheduled_date: goal.scheduledDate,
                due_date: goal.dueDate,
                is_recurring: goal.isRecurring || false,
                recurrence_pattern: goal.RecurringSchedule,
                is_honey: goal.isHoney || false,
                notes: goal.notes || [],
                display_order: i + 1
            });
        }
    }

    // 4. Migrate rewards
    const rewards = await dynamoGetAllRewards();
    for (const reward of rewards) {
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('chat_id', reward.ChatId)
            .single();

        if (user) {
            await supabase.from('rewards').insert({
                user_id: user.id,
                title: reward.Title,
                description: reward.Description,
                cost: reward.Cost,
                status: reward.status || 'active'
            });
        }
    }
}
```

---

## Phase 7: Deployment

### 7.1 Steps
1. Create Supabase project and run schema SQL
2. Add env vars to all Lambda functions:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
3. Deploy updated common/ layer
4. Run migration script
5. Deploy updated Lambda functions
6. Test each bot command
7. Monitor for errors

### 7.2 Rollback Plan
If issues arise:
- DynamoDB tables still exist with original data
- Revert Lambda code to previous version
- Fix issues, re-migrate

---

## Files to Modify

### Critical Path (in order)
1. `common/supabase.js` - NEW: Supabase client
2. `common/userRepository.js` - Rewrite for Supabase
3. `common/goalRepository.js` - Rewrite for Supabase
4. `common/rewardRepository.js` - Rewrite for Supabase
5. `common/honeyRepository.js` - Rewrite for Supabase
6. `api/services/goalService.js` - Update for UUID operations
7. `bot/handlers/*.js` - Update all goal handlers

### Files to Delete
- `rollover/` - Entire directory (no longer needed)
- `.github/workflows/deploy-rollover.yml` - Deployment workflow

### Dependencies to Add
```json
{
  "@supabase/supabase-js": "^2.x"
}
```

---

## Benefits After Migration

| Before (DynamoDB) | After (Supabase) |
|-------------------|------------------|
| Goal incomplete 30 days = 30 records | Goal incomplete 30 days = 1 record |
| Nightly rollover job copies all data | No rollover job at all |
| Recurring goals create daily instances | Single record per recurring goal |
| In-memory filtering for scheduled/due | SQL WHERE clauses with indexes |
| No foreign keys | Proper relational integrity |
| Scan operations for queries | Indexed queries |
| 4 Lambda functions | 3 Lambda functions (no rollover) |

---

## Testable Chunks

### Chunk 1: Supabase Setup
- [ ] Create Supabase project
- [ ] Run schema SQL
- [ ] Verify tables created
- [ ] Test connection from local

### Chunk 2: User Repository
- [ ] Create `common/supabase.js`
- [ ] Rewrite `common/userRepository.js`
- [ ] Test: create user, get user, update tickets
- [ ] Test: partner linking

### Chunk 3: Goal Repository (Core)
- [ ] Rewrite `common/goalRepository.js`
- [ ] Test: add goal, get goals, complete goal
- [ ] Test: scheduled goals show/hide correctly
- [ ] Test: recurring goals reset daily

### Chunk 4: Rewards & Honey-do
- [ ] Rewrite `common/rewardRepository.js`
- [ ] Rewrite `common/honeyRepository.js`
- [ ] Test: create reward, redeem, request workflow

### Chunk 5: Goal Service
- [ ] Update `api/services/goalService.js`
- [ ] Test: index-based operations work
- [ ] Test: swap, move, reorder

### Chunk 6: Bot Handlers
- [ ] Update all handlers in `bot/handlers/`
- [ ] Test each command via Telegram

### Chunk 7: Data Migration
- [ ] Run migration script
- [ ] Verify data integrity
- [ ] Test with real users

### Chunk 8: Cleanup
- [ ] Delete `rollover/` directory
- [ ] Delete `deploy-rollover.yml`
- [ ] Remove EventBridge rule
- [ ] Deploy all services
