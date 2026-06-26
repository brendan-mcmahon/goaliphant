/**
 * Migration script: GoaliphantGoals old schema → new schema
 * Old: PK=chatId, SK=date, goals=List<Map>
 * New: PK=chatId, SK=goalId (UUID), individual goal items with status field
 *
 * Strategy:
 * 1. Scan old table, collect latest record per chatId
 * 2. Create GoaliphantGoalsV2 with new key schema
 * 3. Write individual goal items to V2
 * 4. Wait for V2 to be active
 * 5. Delete old GoaliphantGoals
 * 6. Create GoaliphantGoals with new key schema
 * 7. Copy all items from V2 to new GoaliphantGoals
 * 8. Delete V2
 */

const AWS = require('aws-sdk');
const { randomUUID } = require('crypto');

AWS.config.update({ region: 'us-east-2' });

const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

const OLD_TABLE = 'GoaliphantGoals';
const TEMP_TABLE = 'GoaliphantGoalsV2';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForTable(tableName, targetStatus = 'ACTIVE') {
  console.log(`Waiting for ${tableName} to be ${targetStatus}...`);
  while (true) {
    try {
      const result = await dynamodb.describeTable({ TableName: tableName }).promise();
      const status = result.Table.TableStatus;
      if (status === targetStatus) {
        console.log(`  ${tableName} is ${targetStatus}`);
        return;
      }
      console.log(`  Status: ${status}, waiting...`);
    } catch (e) {
      if (targetStatus === 'NOT_FOUND' && e.code === 'ResourceNotFoundException') {
        console.log(`  ${tableName} is gone`);
        return;
      }
      throw e;
    }
    await sleep(5000);
  }
}

async function scanAllItems(tableName) {
  const items = [];
  let lastKey;
  do {
    const params = { TableName: tableName };
    if (lastKey) params.ExclusiveStartKey = lastKey;
    const result = await docClient.scan(params).promise();
    items.push(...result.Items);
    lastKey = result.LastEvaluatedKey;
    console.log(`  Scanned ${items.length} items...`);
  } while (lastKey);
  return items;
}

function extractGoalFields(rawGoal) {
  // Old goals might have various fields; extract what's useful
  const fields = {};
  const copy = (key) => { if (rawGoal[key] !== undefined) fields[key] = rawGoal[key]; };
  copy('text');
  copy('completed');
  copy('createdAt');
  copy('completedAt');
  copy('scheduledDate');
  copy('scheduled');
  copy('isRecurring');
  copy('recurrencePattern');
  copy('recurringSchedule');
  copy('lastCompletedAt');
  copy('notes');
  copy('dueDate');
  copy('isHoney');
  copy('fromPartner');
  return fields;
}

async function main() {
  console.log('=== GoaliphantGoals Migration ===\n');

  // Step 1: Scan old table and collect latest goals per chatId
  console.log('Step 1: Scanning old table for all records...');
  const allItems = await scanAllItems(OLD_TABLE);
  console.log(`Total records: ${allItems.length}`);

  // Group by chatId, keep latest date only
  const latestPerUser = {};
  for (const item of allItems) {
    const chatId = item.chatId;
    const date = item.date;
    if (!latestPerUser[chatId] || date > latestPerUser[chatId].date) {
      latestPerUser[chatId] = item;
    }
  }

  const chatIds = Object.keys(latestPerUser);
  console.log(`Found ${chatIds.length} users: ${chatIds.join(', ')}`);

  // Build new goal items
  const newGoalItems = [];
  for (const [chatId, record] of Object.entries(latestPerUser)) {
    const goals = record.goals || [];
    console.log(`\n  User ${chatId} (${record.name || 'unknown'}) — ${record.date} — ${goals.length} goals`);

    const activeGoals = goals.filter(g => !g.completed);
    const recurringGoals = goals.filter(g => g.isRecurring || g.recurringSchedule);

    // Migrate active (non-completed) goals + recurring goals (might already overlap)
    const toMigrate = goals.filter(g => !g.completed || g.isRecurring || g.recurringSchedule);
    console.log(`    Migrating ${toMigrate.length} goals (${activeGoals.length} active, ${recurringGoals.length} recurring)`);

    toMigrate.forEach((rawGoal, i) => {
      const fields = extractGoalFields(rawGoal);
      const isRecurring = !!(fields.isRecurring || fields.recurringSchedule);

      const newItem = {
        chatId: chatId.toString(),
        goalId: randomUUID(),
        status: 'active',
        completed: isRecurring ? false : (fields.completed || false),
        displayOrder: i + 1,
        createdAt: fields.createdAt || new Date().toISOString(),
        text: fields.text || '',
        ...fields,
        // Normalize recurring: if it was completed, clear lastCompletedAt so it shows as fresh
        ...(isRecurring && fields.completed ? { lastCompletedAt: null, completed: false } : {}),
      };

      // Ensure completed non-recurring stay active (we filtered them out above)
      newItem.status = 'active';

      console.log(`    [${i + 1}] "${newItem.text}" (recurring=${isRecurring})`);
      newGoalItems.push(newItem);
    });
  }

  console.log(`\nTotal goals to migrate: ${newGoalItems.length}`);

  // Step 2: Create temp table
  console.log('\nStep 2: Creating GoaliphantGoalsV2...');
  try {
    await dynamodb.createTable({
      TableName: TEMP_TABLE,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'chatId', AttributeType: 'S' },
        { AttributeName: 'goalId', AttributeType: 'S' }
      ],
      KeySchema: [
        { AttributeName: 'chatId', KeyType: 'HASH' },
        { AttributeName: 'goalId', KeyType: 'RANGE' }
      ]
    }).promise();
    console.log('  Created GoaliphantGoalsV2');
  } catch (e) {
    if (e.code === 'ResourceInUseException') {
      console.log('  GoaliphantGoalsV2 already exists, continuing...');
    } else {
      throw e;
    }
  }

  await waitForTable(TEMP_TABLE);

  // Step 3: Write goals to temp table
  console.log('\nStep 3: Writing goals to GoaliphantGoalsV2...');
  for (const item of newGoalItems) {
    await docClient.put({ TableName: TEMP_TABLE, Item: item }).promise();
    process.stdout.write('.');
  }
  console.log('\n  Done writing to GoaliphantGoalsV2');

  // Verify
  const v2Count = await docClient.scan({ TableName: TEMP_TABLE, Select: 'COUNT' }).promise();
  console.log(`  Verified: ${v2Count.Count} items in GoaliphantGoalsV2`);

  // Step 4: Delete old table
  console.log('\nStep 4: Deleting old GoaliphantGoals table...');
  await dynamodb.deleteTable({ TableName: OLD_TABLE }).promise();
  await waitForTable(OLD_TABLE, 'NOT_FOUND');

  // Step 5: Create new GoaliphantGoals with new schema
  console.log('\nStep 5: Creating new GoaliphantGoals with new schema...');
  await dynamodb.createTable({
    TableName: OLD_TABLE,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'chatId', AttributeType: 'S' },
      { AttributeName: 'goalId', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'chatId', KeyType: 'HASH' },
      { AttributeName: 'goalId', KeyType: 'RANGE' }
    ]
  }).promise();

  await waitForTable(OLD_TABLE);

  // Step 6: Copy from V2 to new GoaliphantGoals
  console.log('\nStep 6: Copying goals from V2 to GoaliphantGoals...');
  const v2Items = await scanAllItems(TEMP_TABLE);
  for (const item of v2Items) {
    await docClient.put({ TableName: OLD_TABLE, Item: item }).promise();
    process.stdout.write('.');
  }
  console.log('\n  Done copying to GoaliphantGoals');

  // Step 7: Delete temp table
  console.log('\nStep 7: Deleting GoaliphantGoalsV2...');
  await dynamodb.deleteTable({ TableName: TEMP_TABLE }).promise();
  console.log('  Delete request submitted');

  console.log('\n=== Migration Complete ===');
  console.log(`Migrated ${newGoalItems.length} goals across ${chatIds.length} users`);
  console.log('GoaliphantGoals now uses PK=chatId, SK=goalId');
}

main().catch(err => {
  console.error('\nMIGRATION FAILED:', err);
  process.exit(1);
});
