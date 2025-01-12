require('dotenv').config();
const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const honeyTable = 'GoaliphantHoneyDo';
const TIME_ZONE = 'America/Indiana/Indianapolis';

function getLocalDate() {
	const date = new Date();
	const localDate = date.toLocaleString('en-US', { timeZone: TIME_ZONE });
	return new Date(localDate).toISOString().split('T')[0];
}

async function getHoney(chatId, date = null) {
	date = date ?? getLocalDate();

	console.log('Fetching honey for', chatId, 'on', date);

	const params = {
		TableName: honeyTable,
		Key: {
			chatId: chatId.toString(),
			date: date,
		},
	};

	try {
		const result = await dynamoDb.get(params).promise();
		return result.Item ? result.Item.goals : [];
	} catch (err) {
		console.error('Error fetching honey:', err);
		throw err;
	}
}
exports.getHoney = getHoney;

async function getAllHoney() {
	const params = {
		TableName: honeyTable,
	};

	try {
		const result = await dynamoDb.scan(params).promise();
		return result.Items;
	} catch (err) {
		console.error('Error fetching honey:', err);
		throw err;
	}
}
exports.getAllHoney = getAllHoney;

async function updateHoney(chatId, honey) {
	const date = getLocalDate();
	const params = {
		TableName: honeyTable,
		Key: {
			chatId: chatId.toString(),
			date: date,
		},
		UpdateExpression: 'set goals = :goals',
		ExpressionAttributeValues: {
			':goals': honey,
		},
	};

	try {
		await dynamoDb.update(params).promise();
		console.log('Hony-do list updated successfully');
	} catch (err) {
		console.error('Error updating honey:', err);
		throw err;
	}
}
exports.updateHoney = updateHoney;

async function createNewDayWithHoney(chatId, honey, date = null) {
	date = date ?? getLocalDate();
	const formattedHoney = honey.map(goal => ({ text: goal.text, completed: false }));

	const params = {
		TableName: honeyTable,
		Item: {
			chatId: chatId.toString(),
			date: date,
			goals: formattedHoney,
		},
	};

	try {
		await dynamoDb.put(params).promise();
		console.log('Honey-do list rolled over successfully');
	} catch (err) {
		console.error('Error saving honey:', err);
		throw err;
	}
}
exports.createNewDayWithHoney = createNewDayWithHoney;

