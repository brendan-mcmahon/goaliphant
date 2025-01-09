require('dotenv').config();
const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const goalsTable = 'GoaliphantGoals';
const userTable = 'GoaliphantUsers';
const TIME_ZONE = 'America/Indiana/Indianapolis';

function getLocalDate() {
	const date = new Date();
	const localDate = date.toLocaleString('en-US', { timeZone: TIME_ZONE });
	return new Date(localDate).toISOString().split('T')[0];
}

async function getGoals(chatId) {
	const date = getLocalDate();

	const params = {
		TableName: goalsTable,
		Key: {
			chatId: chatId.toString(),
			date: date,
		},
	};

	try {
		const result = await dynamoDb.get(params).promise();
		return result.Item ? result.Item.goals : [];
	} catch (err) {
		console.error('Error fetching goals:', err);
		throw err;
	}
}
exports.getGoals = getGoals;

async function updateGoals(chatId, goals) {
	const date = getLocalDate();
	const params = {
		TableName: goalsTable,
		Key: {
			chatId: chatId.toString(),
			date: date,
		},
		UpdateExpression: 'set goals = :goals',
		ExpressionAttributeValues: {
			':goals': goals,
		},
	};

	try {
		await dynamoDb.update(params).promise();
		console.log('Goals updated successfully');
	} catch (err) {
		console.error('Error updating goals:', err);
		throw err;
	}
}
exports.updateGoals = updateGoals;

async function saveUser(chatId) {
	const params = {
		TableName: userTable,
		Item: {
			ChatId: chatId.toString(),
			Mode: null,
		},
	};

	try {
		await dynamoDb.put(params).promise();
		console.log('User saved successfully');
	} catch (err) {
		console.error('Error saving user:', err);
		throw err;
	}
}
exports.saveUser = saveUser;

async function getUserMode(chatId) {
	const params = {
		TableName: userTable,
		Key: { ChatId: chatId.toString() },
	};
	try {
		const result = await dynamoDb.get(params).promise();
		return result.Item && result.Item.Mode ? result.Item.Mode : null;
	} catch (err) {
		console.error('Error fetching user mode:', err);
		throw err;
	}
}
exports.getUserMode = getUserMode;

async function setUserMode(chatId, mode) {
	const params = {
		TableName: userTable,
		Key: { ChatId: chatId.toString() },
		UpdateExpression: 'SET Mode = :mode',
		ExpressionAttributeValues: { ':mode': mode },
	};
	try {
		await dynamoDb.update(params).promise();
		console.log('User mode updated successfully');
	} catch (err) {
		console.error('Error updating user mode:', err);
		throw err;
	}
}
exports.setUserMode = setUserMode;

async function clearUserMode(chatId) {
	const params = {
		TableName: userTable,
		Key: { ChatId: chatId.toString() },
		UpdateExpression: 'REMOVE Mode',
	};
	try {
		await dynamoDb.update(params).promise();
		console.log('User mode cleared successfully');
	} catch (err) {
		console.error('Error clearing user mode:', err);
		throw err;
	}
}
exports.clearUserMode = clearUserMode;
