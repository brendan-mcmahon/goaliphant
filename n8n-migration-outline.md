# n8n Migration Outline - Goaliphant

This document outlines the migration of Goaliphant's Lambda functions to n8n workflows, starting with the three priority endpoints.

---

## Architecture Overview

### Current Architecture
```
Telegram → Bot Lambda → API Lambda → DynamoDB
                              ↓
                        Service Layer
                              ↓
                        Repository Layer
```

### Target n8n Architecture
```
Telegram Trigger → n8n Workflow → DynamoDB (via HTTP/AWS nodes)
```

### Key Design Decisions

1. **One workflow per command** - Keeps workflows manageable and independently deployable
2. **Shared sub-workflows** - Common operations (get goals, update goals) as reusable sub-workflows
3. **Webhook triggers** - Telegram webhook sends updates to n8n webhook endpoints

---

## Shared Sub-Workflows

These sub-workflows will be called by multiple command workflows:

### 1. `sub-get-goals`
**Purpose**: Retrieve goals array for a user on a given date

**Inputs**:
- `chatId` (required)
- `date` (optional, defaults to today)

**Flow**:
1. Format date to `YYYY-MM-DD` if not provided
2. DynamoDB GetItem: `GoaliphantGoals` table, key `{chatId, date}`
3. Return `goals` array (or empty array if not found)

**Output**: `{ goals: [...], date: "YYYY-MM-DD" }`

---

### 2. `sub-update-goals`
**Purpose**: Save updated goals array back to DynamoDB

**Inputs**:
- `chatId`
- `goals` (array)
- `date` (optional, defaults to today)

**Flow**:
1. DynamoDB UpdateItem: `GoaliphantGoals` table
2. UpdateExpression: `SET goals = :goals`
3. Return success/failure

---

### 3. `sub-send-telegram-message`
**Purpose**: Send a message back to the user

**Inputs**:
- `chatId`
- `text`
- `parseMode` (optional: "Markdown" | "HTML")

**Flow**:
1. HTTP Request to Telegram Bot API: `sendMessage`

---

### 4. `sub-get-user`
**Purpose**: Retrieve user record (for partner info, ticket balance, etc.)

**Inputs**:
- `chatId`

**Flow**:
1. DynamoDB GetItem: `GoaliphantUsers` table

---

## Priority Workflows

---

## 1. Add Goal Workflow

**Trigger**: Telegram webhook with `/add` command or direct message

### Workflow Steps

```
┌─────────────────┐
│ Telegram        │
│ Webhook Trigger │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parse Message   │
│ - Extract text  │
│ - Get chatId    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate Input  │
│ - Text not empty│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call:           │
│ sub-get-goals   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build Goal      │
│ Object          │
│ - text          │
│ - completed:    │
│   false         │
│ - createdAt     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Append to Array │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call:           │
│ sub-update-goals│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call: sub-send- │
│ telegram-message│
│ "Goal added!"   │
└─────────────────┘
```

### Node Details

| Node | Type | Configuration |
|------|------|---------------|
| Telegram Trigger | Webhook | Listen for `/add` command or message |
| Parse Message | Code/Function | Extract `message.text`, `message.chat.id` |
| Validate | IF | Check text is not empty after removing `/add` |
| Get Goals | Execute Sub-Workflow | `sub-get-goals` with chatId |
| Build Goal | Code | Create goal object with timestamp |
| Append | Code | `goals.push(newGoal)` |
| Update Goals | Execute Sub-Workflow | `sub-update-goals` |
| Send Message | Execute Sub-Workflow | `sub-send-telegram-message` |

### Multi-Goal Support

The original supports adding multiple goals separated by newlines. Handle with:

```javascript
// In "Build Goal" node
const lines = text.split('\n').filter(line => line.trim());
const newGoals = lines.map(line => ({
  text: line.trim(),
  completed: false,
  createdAt: new Date().toISOString()
}));
// Append all to existing goals array
```

### Response Messages

- Success (single): `"Goal added: {text}"`
- Success (multiple): `"Added {count} goals"`
- Error (empty): `"Please provide a goal. Usage: /add Buy groceries"`

---

## 2. Complete Goal Workflow

**Trigger**: Telegram webhook with `/complete` command

### Workflow Steps

```
┌─────────────────┐
│ Telegram        │
│ Webhook Trigger │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parse Command   │
│ - Extract       │
│   indexes       │
│ - Get chatId    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate        │
│ - Has indexes?  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call:           │
│ sub-get-goals   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate        │
│ Indexes         │
│ - In bounds?    │
│ - Not already   │
│   completed?    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Mark Completed  │
│ - completed:    │
│   true          │
│ - completedAt   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call:           │
│ sub-update-goals│
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Calculate Tickets   │
│ - Skip if isHoney   │
└────────┬────────────┘
         │
         ▼
┌─────────────────┐
│ Award Tickets   │
│ (DynamoDB ADD)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send Response   │
└─────────────────┘
```

### Node Details

| Node | Type | Configuration |
|------|------|---------------|
| Parse Command | Code | Parse `/complete 1 3 5` → `[0, 2, 4]` (convert to 0-based) |
| Validate Indexes | Code | Check all indexes are valid |
| Mark Completed | Code | Set `completed: true`, `completedAt` |
| Calculate Tickets | Code | Count non-honey goals completed |
| Award Tickets | AWS DynamoDB | UpdateExpression: `ADD TicketWallet :tickets` |

### Index Conversion (Critical)

Users input 1-based indexes. Convert to 0-based:

```javascript
// Parse "1 3 5" → [0, 2, 4]
const userIndexes = text.replace('/complete', '').trim().split(/\s+/);
const indexes = userIndexes.map(n => parseInt(n) - 1);
```

### Ticket Logic

```javascript
// Only award tickets for non-honey goals
const ticketsToAward = completedGoals.filter(g => !g.isHoney).length;
```

### Response Messages

- Success: `"Completed {count} goal(s)! +{tickets} tickets 🎟️"`
- Error (invalid index): `"Goal {n} doesn't exist. You have {total} goals."`
- Error (already done): `"Goal {n} is already completed."`

---

## 3. List Goals Workflow

**Trigger**: Telegram webhook with `/list` command

### Workflow Steps

```
┌─────────────────┐
│ Telegram        │
│ Webhook Trigger │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parse Command   │
│ - Extract       │
│   filter arg    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call:           │
│ sub-get-goals   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Apply Filter    │
│ (Switch node)   │
└────────┬────────┘
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
┌───────┐ ┌──────┐ ┌──────┐ ┌────────┐
│ today │ │ todo │ │ done │ │ all    │
└───┬───┘ └──┬───┘ └──┬───┘ └───┬────┘
    └────┬────┴────────┴────────┘
         │
         ▼
┌─────────────────┐
│ Sort by         │
│ Due Date        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Format Message  │
│ - Add checkboxes│
│ - Add due dates │
│ - Add indexes   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send Response   │
└─────────────────┘
```

### Filter Logic

| Filter | Behavior |
|--------|----------|
| `today` (default) | Exclude future-scheduled, include recurring if matches today |
| `todo` | Only incomplete goals |
| `done` | Only completed goals |
| `all` | No filtering |
| `scheduled` | Only goals with future scheduled dates |

### Due Date Sorting Priority

```javascript
function getDueDatePriority(goal) {
  if (!goal.dueDate) return 3;

  const due = new Date(goal.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (due < today && !goal.completed) return 0;  // Overdue
  if (due.toDateString() === today.toDateString()) return 1;  // Due today
  // ... etc
}
```

### Message Formatting

```javascript
function formatGoal(goal, index) {
  let line = goal.completed ? '✅' : '⬜';

  // Due date indicator
  if (goal.dueDate) {
    const indicator = getDueDateIndicator(goal.dueDate);
    if (indicator) line += ` ${indicator}`;
  }

  // Scheduled marker
  if (goal.scheduledDate) line += ` 🗓️`;

  // Recurring marker
  if (goal.recurring) line += ` 🔄`;

  return `${index + 1}. ${line} ${goal.text}`;
}
```

### Response Messages

- Goals exist: Numbered list with status indicators
- No goals: `"No goals found. Add some with /add"`
- Filter empty: `"No {filter} goals found."`

---

## DynamoDB Access Pattern

### Option A: AWS SDK Node (Recommended)
Use n8n's AWS DynamoDB node directly:
- Configure with AWS credentials
- TableName: `GoaliphantGoals` / `GoaliphantUsers`

### Option B: HTTP Request to API Gateway
If you want to keep the API layer:
- Keep existing Lambda API
- n8n calls API endpoints via HTTP Request node

### Option C: Direct HTTP to DynamoDB
Use DynamoDB's HTTP API directly (requires SigV4 signing - complex)

**Recommendation**: Option A for simplicity, Option B if you want to maintain API abstraction.

---

## Environment Variables / Credentials

Configure in n8n:

| Credential | Purpose |
|------------|---------|
| AWS Credentials | DynamoDB access |
| Telegram Bot Token | Send messages |

| Variable | Value |
|----------|-------|
| `GOALS_TABLE` | `GoaliphantGoals` |
| `USERS_TABLE` | `GoaliphantUsers` |
| `TIMEZONE` | `America/New_York` (or your timezone) |

---

## Telegram Webhook Setup

1. Create n8n webhook trigger for each workflow
2. Set Telegram webhook to n8n URL:
   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<N8N_WEBHOOK_URL>
   ```

**Option**: Single webhook that routes to different workflows based on command:

```
Webhook → Router (Switch on command) → /add workflow
                                     → /complete workflow
                                     → /list workflow
```

---

## Migration Checklist

### Phase 1: Core Workflows
- [ ] Set up n8n instance with AWS credentials
- [ ] Create `sub-get-goals` sub-workflow
- [ ] Create `sub-update-goals` sub-workflow
- [ ] Create `sub-send-telegram-message` sub-workflow
- [ ] Create Add Goal workflow
- [ ] Create Complete Goal workflow
- [ ] Create List Goals workflow
- [ ] Test with Telegram webhook

### Phase 2: Additional Commands
- [ ] Delete goal (`/delete`)
- [ ] Edit goal (`/edit`)
- [ ] Swap goals (`/swap`)
- [ ] Move goal (`/move`)
- [ ] Add note (`/note`)
- [ ] Goal details (`/details`)

### Phase 3: Partner System
- [ ] Partner linking (`/partner`)
- [ ] Honey-do lists (`/honey`)
- [ ] Ticket wallet (`/wallet`)
- [ ] Rewards (`/rewards`, `/redeem`)

### Phase 4: Scheduling
- [ ] Schedule goals (`/schedule`)
- [ ] Recurring goals (`/recurring`)
- [ ] Daily rollover workflow (scheduled trigger)
- [ ] Notification workflow (scheduled trigger)

---

## Notes & Considerations

### Date Handling
Goals are partitioned by date (`YYYY-MM-DD`). Ensure consistent timezone handling:
```javascript
// Get today's date in local timezone
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
```

### Array-Based Storage
All goals for a user+date are stored as a single array. This means:
- Every update requires read → modify → write
- No partial updates possible
- Consider race conditions if user sends rapid commands

### Recurring Goals
Requires cron expression evaluation. Options:
- Use n8n's built-in cron parsing
- Use a code node with a cron library
- Pre-calculate next occurrence dates

### Error Handling
Each workflow should have error handling:
- Catch node for DynamoDB failures
- Validation errors return friendly messages
- Log errors for debugging
