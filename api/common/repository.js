/**
 * Updates a goal to make it recurring with the specified cron expression
 * @param {string} chatId - The chat ID
 * @param {string} goalId - The goal ID
 * @param {string} cronExpression - The cron expression for recurrence
 * @returns {Promise<Object>} - The updated goal
 */
async function updateGoalRecurring(chatId, goalId, cronExpression) {
  const params = {
    TableName: GOALS_TABLE,
    Key: {
      ChatId: chatId,
      Id: goalId
    },
    UpdateExpression: "set RecurringSchedule = :cron, IsRecurring = :isRecurring",
    ExpressionAttributeValues: {
      ":cron": cronExpression,
      ":isRecurring": true
    },
    ReturnValues: "ALL_NEW"
  };

  const result = await docClient.update(params).promise();
  return result.Attributes;
}

// Make sure to export the new function
module.exports = {
  // ... existing exports ...
  updateGoalRecurring,
  // ... existing exports ...
}; 