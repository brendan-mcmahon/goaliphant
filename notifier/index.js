require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getGoals, setChatState, getChatIds } = require('./repository');

const bot = new TelegramBot(process.env.BOT_TOKEN);

async function sendNightlyPrompt(chatId) {
	try {
		const goals = await getGoals(chatId);
		const goalsList = goals.map((g, i) => `${i + 1}. ${g.completed ? '✅' : '⬜'} ${g.text}`).join('\n');
		const message = `Good evening! Here's what you accomplished today:\n${goalsList || 'No goals set for today.'}\n\nReady to set your goals for tomorrow? Send them as a comma-separated list.`;
		await setChatState(chatId, 'tomorrow');
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
