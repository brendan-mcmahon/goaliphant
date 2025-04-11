require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getChatIds } = require('./common/userRepository');
const { getGoals } = require('./common/goalRepository');

const bot = new TelegramBot(process.env.BOT_TOKEN);

async function sendNightlyPrompt(chatId) {
	try {
		const goals = await getGoals(chatId);
		const goalsList = goals.filter(g => g.completed).map((g, i) => `${i + 1}. ✅${g.text}`).join('\n');
		const message = `Good evening! Here's what you accomplished today:\n${goalsList || 'Nothing :('}`;
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

exports.handler = async (event) => {
	console.log('Received event:', event);
	const type = event.type;
	console.log('Event type:', type);
	const chatIds = event.chatIds ?? await getChatIds();

	const filteredChatIds = chatIds.filter(chatId => chatId !== '-4711773993');

	for (const chatId of filteredChatIds) {

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
