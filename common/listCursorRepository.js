require('dotenv').config();
const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const listCursorTable = 'GoaliphantListCursors';

// Cursors expire on their own (DynamoDB TTL on ExpiresAt) so a stale "continue" doesn't resurface days later
const CURSOR_TTL_SECONDS = 60 * 60;

async function getListCursor(chatId) {
	const params = {
		TableName: listCursorTable,
		Key: { ChatId: chatId.toString() },
	};

	try {
		const result = await dynamoDb.get(params).promise();
		const cursor = result.Item;
		// TTL deletion can lag, so check expiry ourselves too
		if (!cursor || cursor.ExpiresAt < Math.floor(Date.now() / 1000)) {
			return null;
		}
		return { filter: cursor.Filter, offset: cursor.Offset };
	} catch (err) {
		console.error('Error fetching list cursor:', err);
		throw err;
	}
}
exports.getListCursor = getListCursor;

async function saveListCursor(chatId, filter, offset) {
	const params = {
		TableName: listCursorTable,
		Item: {
			ChatId: chatId.toString(),
			Filter: filter,
			Offset: offset,
			ExpiresAt: Math.floor(Date.now() / 1000) + CURSOR_TTL_SECONDS,
		},
	};

	try {
		await dynamoDb.put(params).promise();
	} catch (err) {
		console.error('Error saving list cursor:', err);
		throw err;
	}
}
exports.saveListCursor = saveListCursor;

async function clearListCursor(chatId) {
	const params = {
		TableName: listCursorTable,
		Key: { ChatId: chatId.toString() },
	};

	try {
		await dynamoDb.delete(params).promise();
	} catch (err) {
		console.error('Error clearing list cursor:', err);
		throw err;
	}
}
exports.clearListCursor = clearListCursor;
