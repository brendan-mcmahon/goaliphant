require('dotenv').config();
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const goalsTable = 'GoaliphantGoals';
const userTable = 'GoaliphantUsers';
const rewardsTable = 'GoaliphantRewards';
const TIME_ZONE = 'America/Indiana/Indianapolis';

function getLocalDate() {
	const date = new Date();
	const localDate = date.toLocaleString('en-US', { timeZone: TIME_ZONE });
	return new Date(localDate).toISOString().split('T')[0];
}

async function getGoals(chatId, date = null) {
	date = date ?? getLocalDate();

	console.log('Fetching goals for', chatId, 'on', date);

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
	date = date ?? getLocalDate();
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
	console.log("getting chat state for chatId:", chatId);
	const params = {
		TableName: userTable,
		Key: { ChatId: chatId.toString() },
	};
	try {
		const result = await dynamoDb.get(params).promise();
		return { state: result.Item?.ChatState, date: result.Item?.ChatStateDateTime, args: result.Item?.ChatStateArgs };
	} catch (err) {
		console.error('Error fetching chat state:', err);
		throw err;
	}
}
exports.getChatState = getChatState;

async function setChatState(chatId, chatState, chatStateArgs = null) {
	const currentDateTime = new Date().toISOString();

	const updateExpression = chatStateArgs
		? 'SET ChatState = :chatState, ChatStateDateTime = :chatStateDateTime, ChatStateArgs = :chatStateArgs'
		: 'SET ChatState = :chatState, ChatStateDateTime = :chatStateDateTime';

	const expressionAttributeValues = chatStateArgs
		? {
			':chatState': chatState,
			':chatStateDateTime': currentDateTime,
			':chatStateArgs': chatStateArgs,
		}
		: {
			':chatState': chatState,
			':chatStateDateTime': currentDateTime,
		};

	const params = {
		TableName: userTable,
		Key: { ChatId: chatId.toString() },
		UpdateExpression: updateExpression,
		ExpressionAttributeValues: expressionAttributeValues,
	};
	try {
		await dynamoDb.update(params).promise();
		console.log('Chat state and date-time updated successfully');
	} catch (err) {
		console.error('Error updating chat state and date-time:', err);
		throw err;
	}
}

exports.setChatState = setChatState;

async function clearChatState(chatId) {
	await setChatState(chatId, 'chat');
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

const addTicket = async (chatId, ticket = 1) => {
	const params = {
		TableName: userTable,
		Key: { ChatId: chatId.toString() },
		UpdateExpression: 'ADD TicketWallet :ticket',
		ExpressionAttributeValues: {
			':ticket': ticket,
		},
		ReturnValues: 'UPDATED_NEW',
	};

	try {
		const result = await dynamoDb.update(params).promise();
		console.log('Tickets updated successfully');
		return result.Attributes.Tickets;
	} catch (err) {
		console.error('Error updating tickets:', err);
		throw err;
	}
}
exports.addTicket = addTicket;

const getTicketCount = async (chatId) => {
	const params = {
		TableName: userTable,
		Key: { ChatId: chatId.toString() },
		ProjectionExpression: 'TicketWallet',
	};

	try {
		const result = await dynamoDb.get(params).promise();
		console.log('Tickets fetched successfully');
		return result.Item.TicketWallet;
	} catch (err) {
		console.error('Error fetching tickets:', err);
		throw err;
	}
}
exports.getTicketCount = getTicketCount;

const getReward = async (chatId, rewardId) => {
	const params = {
		TableName: rewardsTable,
		Key: {
			ChatId: chatId.toString(),
			RewardId: rewardId,
		},
	};

	try {
		const result = await dynamoDb.get(params).promise();
		console.log('Reward fetched successfully');
		return result.Item;
	} catch (err) {
		console.error('Error fetching reward:', err);
		throw err;
	}
}
exports.getReward = getReward;

const getRewards = async (chatId) => {
	console.log('Fetching rewards for', chatId);
	const params = {
		TableName: rewardsTable,
		KeyConditionExpression: 'ChatId = :chatId',
		ExpressionAttributeValues: {
			':chatId': chatId.toString(),
		},
	};

	try {
		const result = await dynamoDb.query(params).promise();
		console.log('Got rewards:', result.Items);
		return result.Items;
	} catch (err) {
		console.error('Error adding reward:', err);
		throw err;
	}
};

exports.getRewards = getRewards;

const insertReward = async (chatId) => {
	const rewardId = uuidv4();
	const params = {
		TableName: rewardsTable,
		Item: {
			ChatId: chatId.toString(),
			RewardId: rewardId,
			Title: 'New Reward',
			Description: 'Description',
			Cost: 1,
		},
	};

	try {
		await dynamoDb.put(params).promise();
		console.log('Reward inserted successfully');
		return rewardId;
	} catch (err) {
		console.error('Error inserting reward:', err);
		throw err;
	}
}
exports.insertReward = insertReward;

const updateReward = async (chatId, reward) => {
	console.log("updating reward", reward);

	let updateExpression = 'SET ';

	const attributeNames = {}
	const attributeValues = {}

	if (reward.title) {
		attributeNames['#title'] = 'Title';
		attributeValues[':title'] = reward.title;
		updateExpression += '#title = :title';
	}
	if (reward.description) {
		attributeNames['#description'] = 'Description';
		attributeValues[':description'] = reward.description;
		if (updateExpression !== 'SET ') {
			updateExpression += ', ';
		}
		updateExpression += '#description = :description';
	}
	if (reward.cost) {
		attributeNames['#cost'] = 'Cost';
		attributeValues[':cost'] = reward.cost;
		if (updateExpression !== 'SET ') {
			updateExpression += ', ';
		}
		updateExpression += '#cost = :cost';
	}

	const params = {
		TableName: rewardsTable,
		Key: {
			ChatId: chatId.toString(),
			RewardId: reward.rewardId,
		},
		UpdateExpression: updateExpression,
		ExpressionAttributeNames: attributeNames,
		ExpressionAttributeValues: attributeValues,
		ReturnValues: 'ALL_NEW',
	};

	try {
		const result = await dynamoDb.update(params).promise();
		console.log('Reward upserted successfully:', result.Attributes);
		return reward.rewardId;
	} catch (err) {
		console.error('Error upserting reward:', err);
		throw err;
	}
};

exports.updateReward = updateReward;

const deleteReward = async (chatId, rewardId) => {
	const params = {
		TableName: rewardsTable,
		Key: {
			ChatId: chatId.toString(),
			RewardId: rewardId,
		},
	};

	try {
		await dynamoDb.delete(params).promise();
		console.log('Reward deleted successfully');
	} catch (err) {
		console.error('Error deleting reward:', err);
		throw err;
	}
};
exports.deleteReward = deleteReward;