const { getChatState, clearChatState } = require('../common/repository.js');
const { saveGoalsAndList } = require('./addGoalsHandler.js');
const { sendMessage } = require('../bot.js');

const cancelWords = [
	'cancel',
	'nevermind',
	'no thanks',
	'no thank you',
]

const response = { statusCode: 200, body: 'OK' };
const fiveMinutes = 300000;

async function handleChatState(text, chatId) {
	const { state, date, args } = await getChatState(chatId);
	console.log('state:', state);

	if (await shouldCancel(chatId, text)) {
		return response;
	}

	if (state && date && new Date(date) < new Date(Date.now() - fiveMinutes)) {
		await clearChatState(chatId);
		return response;
	}

	if (state && state === 'addGoals') {
		await saveGoalsAndList(text.split(','), chatId);
		await clearChatState(chatId);
	}

	if (state && state === 'tomorrow') {
		await saveGoalsAndList(text.split(','), chatId);
		await clearChatState(chatId);
	}

	if (state && state.startsWith('creatingReward')) {
		const step = parseInt(state.split('-')[1]);

		return null;
	}
	console.log('no state');
	return null;
}
exports.handleChatState = handleChatState;

async function shouldCancel(chatId, text) {
	if (cancelWords.includes(text.toLowerCase())) {
		await clearChatState(chatId);
		await sendMessage(chatId, 'Reward creation cancelled.');
		return true;
	}
}