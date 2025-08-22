# n8n Workflow Plan: `/add` and `/complete` Commands

## Prerequisites

### n8n Setup
1. **Credentials Needed**:
   - Telegram Bot Token
   - AWS credentials (for DynamoDB access)
   
2. **Environment Variables**:
   - `BOT_TOKEN`: Your Telegram bot token
   - `AWS_REGION`: us-east-2
   - `DYNAMODB_GOALS_TABLE`: GoaliphantGoals
   - `DYNAMODB_USERS_TABLE`: GoaliphantUsers

## Workflow 1: `/add` Command

### Flow Overview
```
Telegram Webhook → Parse Message → Send "Thinking" → Add Goals → Update DynamoDB → Send Success Message
```

### Detailed Node Structure

#### 1. **Telegram Trigger** (or Webhook)
- Receives incoming messages from Telegram
- Outputs: `chatId`, `message.text`, `message_id`

#### 2. **Filter Node** (IF)
- Condition: Check if message starts with `/add`
- Continue only if true

#### 3. **Send Thinking Message** (Telegram Node)
- Action: Send Message
- Chat ID: `{{ $json.message.chat.id }}`
- Text: "Thinking... 🤔"
- Store the `message_id` for later editing

#### 4. **Parse Command** (Code Node)
```javascript
const text = $input.first().json.message.text;
const chatId = $input.first().json.message.chat.id;

// Remove /add command and trim
const goalsText = text.replace('/add', '').trim();

// Check if empty
if (!goalsText) {
  return [{
    json: {
      error: true,
      errorMessage: '⚠️ Please provide at least one goal text.',
      chatId: chatId
    }
  }];
}

// Split by newlines for multiple goals
const newGoals = goalsText.split('\n')
  .filter(text => text.trim() !== '')
  .map(text => ({
    text: text.trim(),
    completed: false,
    createdAt: new Date().toISOString()
  }));

return [{
  json: {
    chatId: chatId.toString(),
    newGoals: newGoals,
    goalsText: goalsText,
    error: false
  }
}];
```

#### 5. **Branch on Error** (IF Node)
- If error=true → Send error message and end
- If error=false → Continue

#### 6. **Get Current Date** (Code Node)
```javascript
// Matches your getLocalDate() function
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const localDate = `${year}-${month}-${day}`;

return [{
  json: {
    ...$input.first().json,
    date: localDate
  }
}];
```

#### 7. **Get Existing Goals** (AWS DynamoDB Node)
- Operation: Get Item
- Table: GoaliphantGoals
- Key: 
  ```json
  {
    "chatId": "{{ $json.chatId }}",
    "date": "{{ $json.date }}"
  }
  ```

#### 8. **Merge Goals** (Code Node)
```javascript
const existingGoals = $input.first().json.goals || [];
const newGoals = $input.all()[0].json.newGoals;
const chatId = $input.all()[0].json.chatId;
const date = $input.all()[0].json.date;

const allGoals = [...existingGoals, ...newGoals];

// Prepare success message
let message = '✅ Added:';
newGoals.forEach((goal, i) => {
  message += `\n${existingGoals.length + i + 1}. ${goal.text}`;
});

return [{
  json: {
    chatId: chatId,
    date: date,
    goals: allGoals,
    successMessage: message
  }
}];
```

#### 9. **Update DynamoDB** (AWS DynamoDB Node)
- Operation: Update Item
- Table: GoaliphantGoals
- Key:
  ```json
  {
    "chatId": "{{ $json.chatId }}",
    "date": "{{ $json.date }}"
  }
  ```
- Update Expression: `SET goals = :goals`
- Expression Values:
  ```json
  {
    ":goals": "{{ $json.goals }}"
  }
  ```

#### 10. **Send Success Message** (Telegram Node)
- Action: Edit Message Text
- Chat ID: `{{ $json.chatId }}`
- Message ID: (from step 3)
- Text: `{{ $json.successMessage }}`

#### 11. **Respond to Webhook**
- Status: 200
- Body: "OK"

---

## Workflow 2: `/complete` Command

### Flow Overview
```
Telegram Webhook → Parse → Send "Thinking" → Get Goals → Mark Complete → Update DB → Add Ticket → Send Success
```

### Detailed Node Structure

#### 1-3. **Same as /add** (Trigger, Filter, Thinking Message)

#### 4. **Parse Complete Command** (Code Node)
```javascript
const text = $input.first().json.message.text;
const chatId = $input.first().json.message.chat.id;
const userId = $input.first().json.message.from.id;

// Parse goal index
const goalIndexStr = text.replace('/complete', '').trim();
const goalIndex = parseInt(goalIndexStr);

// Validate index
if (isNaN(goalIndex) || goalIndex < 1) {
  return [{
    json: {
      error: true,
      errorMessage: '⚠️ Please provide a valid goal number.',
      chatId: chatId
    }
  }];
}

return [{
  json: {
    chatId: chatId.toString(),
    ticketRecipientId: userId.toString(), // for group chats
    goalIndex: goalIndex,
    error: false
  }
}];
```

#### 5. **Branch on Error** (same as /add)

#### 6. **Get Current Date** (same as /add)

#### 7. **Get Goals from DynamoDB** (same as /add)

#### 8. **Mark Goal Complete** (Code Node)
```javascript
const goals = $input.first().json.goals || [];
const goalIndex = $input.all()[0].json.goalIndex;
const chatId = $input.all()[0].json.chatId;

// Check if index is valid
if (goalIndex > goals.length) {
  return [{
    json: {
      error: true,
      errorMessage: `You only have ${goals.length} goals.`,
      chatId: chatId
    }
  }];
}

const goal = goals[goalIndex - 1];

// Check if already completed
if (goal.completed) {
  return [{
    json: {
      error: true,
      errorMessage: `"${goal.text}" is already completed.`,
      chatId: chatId
    }
  }];
}

// Mark as complete
goal.completed = true;
goal.completedAt = new Date().toISOString();

return [{
  json: {
    chatId: chatId,
    goals: goals,
    completedGoal: goal,
    successMessage: `✅ Completed: ${goal.text}\n🎟 You earned 1 ticket!`,
    error: false
  }
}];
```

#### 9. **Branch on Error Again**

#### 10. **Update Goals in DynamoDB** (same as /add step 9)

#### 11. **Add Ticket to User** (AWS DynamoDB Node)
- Operation: Update Item
- Table: GoaliphantUsers
- Key:
  ```json
  {
    "ChatId": "{{ $json.ticketRecipientId }}"
  }
  ```
- Update Expression: `ADD TicketWallet :inc`
- Expression Values:
  ```json
  {
    ":inc": 1
  }
  ```

#### 12. **Send Success Message** (same pattern as /add)

#### 13. **Respond to Webhook**

---

## Common Patterns to Reuse

### Error Handling Pattern
```
Code Node → IF (error check) → Send Error Message → End
                ↓
         Continue Flow
```

### DynamoDB Date Key Pattern
Always use format: `YYYY-MM-DD` for the date field

### Message Update Pattern
1. Send "Thinking..." and store message_id
2. Process command
3. Edit message with actual response

## Testing Plan

### Test Cases for `/add`
1. `/add Buy groceries` - Single goal
2. `/add Task 1\nTask 2\nTask 3` - Multiple goals  
3. `/add` - Empty (should error)
4. `/add    ` - Just spaces (should error)

### Test Cases for `/complete`
1. `/complete 1` - Valid index
2. `/complete 999` - Index too high
3. `/complete` - No index
4. `/complete abc` - Invalid index
5. Complete already completed goal

## Migration Notes

### What's Different from Lambda
1. **No shared code** - Each workflow needs its own date formatting
2. **Visual error handling** - Branches instead of try/catch
3. **Message IDs** - Need to pass between nodes via data
4. **DynamoDB operations** - Using AWS nodes instead of SDK

### What's Similar
1. Same database structure
2. Same Telegram message format
3. Same business logic
4. Same validation rules

## Next Steps

After implementing these two workflows:
1. Test performance (response time)
2. Test error scenarios
3. Evaluate maintainability
4. Decide on continuing with more commands

If successful, the next batch could be:
- `/list` - Read-only, simple
- `/delete` - Similar to complete but removes item
- `/wallet` - Simple read from Users table