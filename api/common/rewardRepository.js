require('dotenv').config();
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const rewardsTable = 'GoaliphantRewards';

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
		console.log('Reward fetched successfully', result.Item);
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

const getAllRewards = async () => {
	const params = {
		TableName: rewardsTable,
	};

	try {
		const result = await dynamoDb.scan(params).promise();
		return result.Items;
	} catch (err) {
		console.error('Error fetching rewards:', err);
		throw err;
	}
};
exports.getAllRewards = getAllRewards;


const insertReward = async (chatId) => {
	const rewardId = uuidv4();
	const params = {
		TableName: rewardsTable,
		Item: {
			ChatId: chatId.toString(),
			RewardId: rewardId,
			Title: 'New Reward',
			Description: 'Description',
			Cost: 0,
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

const addReward = async (chatId, reward) => {
	const rewardId = uuidv4();
	console.log("adding reward", chatId, reward);
	const params = {
		TableName: rewardsTable,
		Item: {
			ChatId: chatId.toString(),
			RewardId: rewardId,
			Title: reward.title,
			Description: reward.description,
			Cost: reward.cost,
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
exports.addReward = addReward;

const updateReward = async (chatId, reward) => {
	console.log("updating reward", chatId, reward);

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
		console.error('Error updating reward:', err);
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