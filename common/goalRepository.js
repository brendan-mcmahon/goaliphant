require('dotenv').config();
const AWS = require('aws-sdk');
const { getLocalDate } = require('./utilities.js');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const goalsTable = 'GoaliphantGoals';

async function getGoals(chatId, date = null) {
	date = date ?? getLocalDate();

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

async function getAllGoals() {
	const params = {
		TableName: goalsTable,
	};

	try {
		const result = await dynamoDb.scan(params).promise();
		return result.Items;
	} catch (err) {
		console.error('Error fetching goals:', err);
		throw err;
	}
}
exports.getAllGoals = getAllGoals;

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

async function createNewDayWithGoals(chatId, username, goals, date = null) {
	date = date ?? getLocalDate();
	const formattedGoals = goals.map(goal => ({ text: goal.text, scheduled: goal.scheduled, completed: false }));

	const params = {
		TableName: goalsTable,
		Item: {
			chatId: chatId.toString(),
			date: date,
			name: username,
			goals: formattedGoals,
		},
	};

	try {
		await dynamoDb.put(params).promise();
		console.log('Goals rolled over successfully');
	} catch (err) {
		console.error('Error saving goals:', err);
		throw err;
	}
}
exports.createNewDayWithGoals = createNewDayWithGoals;
