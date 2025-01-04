require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const goalsTable = 'GoaliphantGoals';
const userTable = 'GoaliphantUsers';
const bot = new TelegramBot(process.env.BOT_TOKEN);

async function getGoals(chatId) {
	const date = new Date().toISOString().split('T')[0];
	const params = {
		TableName: goalsTable,
		Key: {
			chatId: chatId,
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

async function sendNightlyPrompt(chatId) {
	try {
		const goals = await getGoals(chatId);
		const goalsList = goals.map((g, i) => `${i + 1}. ${g.completed ? '✅' : '⬜'} ${g.text}`).join('\n');
		const message = `Good evening! Here's what you accomplished today:\n${goalsList || 'No goals set for today.'}\n\nReady to set your goals for tomorrow? Send them as a comma-separated list.`;
		await bot.sendMessage(chatId, message);
	} catch (error) {
		console.error('Error sending nightly prompt:', error);
	}
}

async function sendMorningReminder(chatId) {
	try {
		const goals = await getGoals(chatId);
		const goalsList = goals.map((g, i) => `${i + 1}. ${g.completed ? '✅' : '⬜'} ${g.text}`).join('\n');
		const message = `Good morning! Here are your goals for today:\n${goalsList || 'No goals set for today.'}`;
		await bot.sendMessage(chatId, message);
	} catch (error) {
		console.error('Error sending morning reminder:', error);
	}
}

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

exports.handler = async (event) => {
	console.log('Received event:', event);
	const type = event.type;
	console.log('Event type:', type);
	const chatIds = await getChatIds();
	for (const chatId of chatIds) {

		if (type === 'morning') {
			await sendMorningReminder(chatId);
		} else if (type === 'nightly') {
			await sendNightlyPrompt(chatId);
		} else {
			console.error('Unknown event type:', type);
		}
	}

	return { statusCode: 200, body: 'Notification sent' };
};
