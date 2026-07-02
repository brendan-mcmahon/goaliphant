require('dotenv').config();
const AWS = require('aws-sdk');
const { randomUUID } = require('crypto');
const { getLocalDate } = require('./utilities.js');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const goalsTable = 'GoaliphantGoals';

const TIME_ZONE = 'America/Indiana/Indianapolis';

function toLocalDateString(isoString) {
	const local = new Date(isoString).toLocaleString('en-US', { timeZone: TIME_ZONE });
	return new Date(local).toISOString().split('T')[0];
}

async function getGoal(chatId, goalId) {
	const params = {
		TableName: goalsTable,
		Key: { chatId: chatId.toString(), goalId }
	};
	try {
		const result = await dynamoDb.get(params).promise();
		return result.Item || null;
	} catch (err) {
		console.error('Error fetching goal:', err);
		throw err;
	}
}
exports.getGoal = getGoal;

async function getGoals(chatId) {
	const params = {
		TableName: goalsTable,
		KeyConditionExpression: 'chatId = :chatId',
		FilterExpression: '#s = :active',
		ExpressionAttributeNames: { '#s': 'status' },
		ExpressionAttributeValues: {
			':chatId': chatId.toString(),
			':active': 'active'
		}
	};

	try {
		const result = await dynamoDb.query(params).promise();
		const goals = result.Items.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

		const today = getLocalDate();
		return goals.map(goal => {
			if (goal.isRecurring && goal.lastCompletedAt) {
				const completedDate = toLocalDateString(goal.lastCompletedAt);
				return { ...goal, completed: completedDate === today };
			}
			return goal;
		});
	} catch (err) {
		console.error('Error fetching goals:', err);
		throw err;
	}
}
exports.getGoals = getGoals;

async function addGoal(chatId, goalData) {
	const existing = await getGoals(chatId);
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

	const params = {
		TableName: goalsTable,
		Item: goal
	};

	try {
		await dynamoDb.put(params).promise();
		return goal;
	} catch (err) {
		console.error('Error adding goal:', err);
		throw err;
	}
}
exports.addGoal = addGoal;

async function updateGoal(chatId, goalId, updates) {
	const setClauses = [];
	const removeClauses = [];
	const expressionAttributeNames = {};
	const expressionAttributeValues = {};

	for (const [key, value] of Object.entries(updates)) {
		const nameKey = `#${key}`;
		const valKey = `:${key}`;
		expressionAttributeNames[nameKey] = key;
		if (value === null || value === undefined) {
			removeClauses.push(nameKey);
		} else {
			setClauses.push(`${nameKey} = ${valKey}`);
			expressionAttributeValues[valKey] = value;
		}
	}

	let updateExpression = '';
	if (setClauses.length > 0) updateExpression += `SET ${setClauses.join(', ')}`;
	if (removeClauses.length > 0) updateExpression += ` REMOVE ${removeClauses.join(', ')}`;

	const params = {
		TableName: goalsTable,
		Key: {
			chatId: chatId.toString(),
			goalId: goalId
		},
		UpdateExpression: updateExpression.trim(),
		ExpressionAttributeNames: expressionAttributeNames
	};

	if (Object.keys(expressionAttributeValues).length > 0) {
		params.ExpressionAttributeValues = expressionAttributeValues;
	}

	try {
		await dynamoDb.update(params).promise();
	} catch (err) {
		console.error('Error updating goal:', err);
		throw err;
	}
}
exports.updateGoal = updateGoal;

async function deleteGoal(chatId, goalId) {
	const params = {
		TableName: goalsTable,
		Key: {
			chatId: chatId.toString(),
			goalId: goalId
		}
	};

	try {
		await dynamoDb.delete(params).promise();
	} catch (err) {
		console.error('Error deleting goal:', err);
		throw err;
	}
}
exports.deleteGoal = deleteGoal;

async function deleteAllGoalsForUser(chatId) {
	try {
		const queryParams = {
			TableName: goalsTable,
			KeyConditionExpression: 'chatId = :chatId',
			ExpressionAttributeValues: { ':chatId': chatId.toString() }
		};

		const queryResult = await dynamoDb.query(queryParams).promise();

		await Promise.all(queryResult.Items.map(item =>
			dynamoDb.delete({
				TableName: goalsTable,
				Key: { chatId: chatId.toString(), goalId: item.goalId }
			}).promise()
		));

		return queryResult.Items.length;
	} catch (err) {
		console.error(`Failed to delete goal records for user ${chatId}:`, err);
		throw err;
	}
}
exports.deleteAllGoalsForUser = deleteAllGoalsForUser;

async function getGoalsCompletedToday(chatId) {
	const today = getLocalDate();

	const params = {
		TableName: goalsTable,
		KeyConditionExpression: 'chatId = :chatId',
		ExpressionAttributeValues: { ':chatId': chatId.toString() }
	};

	try {
		const result = await dynamoDb.query(params).promise();

		return result.Items.filter(goal => {
			const ts = goal.isRecurring ? goal.lastCompletedAt : goal.completedAt;
			if (!ts) return false;
			return toLocalDateString(ts) === today;
		});
	} catch (err) {
		console.error('Error fetching completed goals:', err);
		throw err;
	}
}
exports.getGoalsCompletedToday = getGoalsCompletedToday;

async function getGoalBySharedId(chatId, sharedGoalId) {
	const params = {
		TableName: goalsTable,
		KeyConditionExpression: 'chatId = :chatId',
		ExpressionAttributeValues: { ':chatId': chatId.toString() }
	};
	try {
		const result = await dynamoDb.query(params).promise();
		return result.Items.find(g => g.sharedGoalId === sharedGoalId) || null;
	} catch (err) {
		console.error('Error fetching goal by sharedGoalId:', err);
		throw err;
	}
}
exports.getGoalBySharedId = getGoalBySharedId;

async function shareGoal(chatId, goalId, partnerId) {
	const goal = await getGoal(chatId, goalId);
	if (!goal) throw new Error('Goal not found');
	const sharedGoalId = randomUUID();
	await updateGoal(chatId, goalId, { sharedGoalId });
	await addGoal(partnerId, { text: goal.text, sharedGoalId });
}
exports.shareGoal = shareGoal;

async function addSharedGoal(chatId, partnerId, text) {
	const sharedGoalId = randomUUID();
	await addGoal(chatId, { text, sharedGoalId });
	await addGoal(partnerId, { text, sharedGoalId });
}
exports.addSharedGoal = addSharedGoal;
