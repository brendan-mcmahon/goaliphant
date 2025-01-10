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

async function getGoals(chatId, date = null) {
	const date = date ?? getLocalDate();

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

async function createNewDayWithGoals(chatId, goals, date = null) {
	const date = date ?? getLocalDate();
	const formattedGoals = goals.map(goal => ({ text: goal.text, completed: false }));

	const params = {
		TableName: goalsTable,
		Item: {
			chatId: chatId.toString(),
			date: date,
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


async function saveUser(chatId) {
	const params = {
		TableName: userTable,
		Item: {
			ChatId: chatId.toString(),
			ChatState: null,
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

async function getChatState(chatId) {
	const params = {
		TableName: userTable,
		Key: { ChatId: chatId.toString() },
	};
	try {
		const result = await dynamoDb.get(params).promise();
		return result.Item && result.Item.ChatState ? result.Item.ChatState : null;
	} catch (err) {
		console.error('Error fetching chat state:', err);
		throw err;
	}
}
exports.getChatState = getChatState;

async function setChatState(chatId, chatState) {
	const params = {
		TableName: userTable,
		Key: { ChatId: chatId.toString() },
		UpdateExpression: 'SET ChatState = :chatState',
		ExpressionAttributeValues: { ':chatState': chatState },
	};
	try {
		await dynamoDb.update(params).promise();
		console.log('Chat state updated successfully');
	} catch (err) {
		console.error('Error updating chat state:', err);
		throw err;
	}
}
exports.setChatState = setChatState;

async function clearChatState(chatId) {
	await setChatState(chatId, null);
}
exports.clearChatState = clearChatState;


const getChatIds = async () => {
	const params = {
		TableName: userTable,
		ProjectionExpression: 'ChatId',
	};

	try {
		const data = await dynamoDb.scan(params).promise();
		console.log("chatIds:", data.Items.map(item => item.chatId));
		console.log("ChatIds:", data.Items.map(item => item.ChatId));
		return data.Items.map(item => item.ChatId);
	} catch (err) {
		console.error('Error fetching chat ids:', err);
		throw err;
	}
}
exports.getChatIds = getChatIds;
