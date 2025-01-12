const { getChatState, clearChatState } = require('../common/repository.js');
const { saveGoalsAndList } = require('./addGoalsHandler.js');
const bot = require('../bot.js');

const cancelWords = [
	'cancel',
	'nevermind',
	'no thanks',
	'no thank you',
]

async function handleChatState(text, chatId) {
	const { state, date, args } = await getChatState(chatId);

	if (state && state === 'addGoals') {
		if (date && new Date(date) < new Date(Date.now() - 300000)) {
			await clearChatState(chatId);
		}
		if (cancelWords.includes(text.toLowerCase())) {
			await clearChatState(chatId);
			await bot.sendMessage(chatId, 'Goal addition cancelled.');
			return { statusCode: 200, body: 'OK' };
		}
		await saveGoalsAndList(text.split(','), chatId);
		await clearChatState(chatId);
		return { statusCode: 200, body: 'OK' };
	}

	if (state && state === 'tomorrow') {
		if (date && new Date(date) < new Date(Date.now() - 300000)) {
			await clearChatState(chatId);
		}
		if (cancelWords.includes(text.toLowerCase())) {
			await clearChatState(chatId);
			await bot.sendMessage(chatId, 'Goal addition cancelled.');
			return { statusCode: 200, body: 'OK' };
		}
		await saveGoalsAndList(text.split(','), chatId);
		await clearChatState(chatId);
		return { statusCode: 200, body: 'OK' };
	}

	return null;
}
exports.handleChatState = handleChatState;