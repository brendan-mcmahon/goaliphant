require('dotenv').config();
const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const userTable = 'GoaliphantUsers';

async function getUser(chatId) {
	console.log("Getting user for chatId:", chatId);
	const params = {
		TableName: userTable,
		Key: { ChatId: chatId.toString() },
	};

	try {
		const result = await dynamoDb.get(params).promise();
		if (!result.Item) {
			console.log("User not found for chatId:", chatId);
			return null;
		}
		return result.Item;
	} catch (err) {
		console.error('Error fetching user:', err);
		throw err;
	}
}
exports.getUser = getUser;

async function saveUser(userOrChatId, name = null) {
	let params;
	
	// Handle both user object and legacy chatId/name parameters
	if (typeof userOrChatId === 'object' && userOrChatId.ChatId) {
		// New interface: save full user object
		params = {
			TableName: userTable,
			Item: {
				...userOrChatId,
				ChatId: userOrChatId.ChatId.toString()
			}
		};
	} else {
		// Legacy interface: save with chatId and optional name
		params = {
			TableName: userTable,
			Item: {
				ChatId: userOrChatId.toString(),
				ChatState: 'chat',
			},
		};
		
		if (name) {
			params.Item.Name = name;
		}
	}

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
	console.log("setting chat state for chatId:", chatId, "state:", chatState, "args:", chatStateArgs);
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
	await setChatState(chatId, 'chat', []);
}
exports.clearChatState = clearChatState;


const getChatIds = async () => {
	const params = {
		TableName: userTable,
		ProjectionExpression: 'ChatId',
	};

	try {
		const data = await dynamoDb.scan(params).promise();
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
		UpdateExpression: 'ADD Tickets :ticket',
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
		ProjectionExpression: 'Tickets',
	};

	try {
		const result = await dynamoDb.get(params).promise();
		console.log('Tickets fetched successfully');
		return result.Item?.Tickets || 0;
	} catch (err) {
		console.error('Error fetching tickets:', err);
		throw err;
	}
}
exports.getTicketCount = getTicketCount;

const getAllUsers = async () => {
	const params = {
		TableName: userTable,
	};

	try {
		const data = await dynamoDb.scan(params).promise();
		return data.Items;
	} catch (err) {
		console.error('Error fetching all users:', err);
		throw err;
	}
}
exports.getAllUsers = getAllUsers;

// Add this function to update a specific field in a user record
async function updateUserField(chatId, fieldName, fieldValue) {
	const params = {
		TableName: userTable,
		Key: { ChatId: chatId.toString() },
		UpdateExpression: `SET ${fieldName} = :value`,
		ExpressionAttributeValues: {
			':value': fieldValue,
		},
		ReturnValues: 'UPDATED_NEW',
	};

	try {
		const result = await dynamoDb.update(params).promise();
		console.log(`User field '${fieldName}' updated successfully`);
		return result.Attributes;
	} catch (err) {
		console.error(`Error updating user field '${fieldName}':`, err);
		throw err;
	}
}
exports.updateUserField = updateUserField;

async function clearChat(chatId) {
	await setChatState(chatId, 'chat', []);
}
exports.clearChat = clearChat;
	
