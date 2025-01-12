const { getChatState, clearChatState } = require('../common/repository.js');
const { saveGoalsAndList } = require('./addGoalsHandler.js');
const { sendMessage } = require('../bot.js');
const { handleCreateRewardStep } = require('./createRewardHandler.js');

const cancelWords = [
	'cancel',
	'nevermind',
	'no thanks',
	'no thank you',
]

const isExpired = (date) => {
	const fiveMinutes = 300000;
	!date || new Date(date) < new Date(Date.now() - fiveMinutes);
}


async function handleChatState(text, chatId) {
	const { state, date, args } = await getChatState(chatId);
	console.log('state:', state);

	if (await shouldCancel(chatId, text)) {
		console.log('user cancelled state');
		return true;
	}
	if (!state || state === 'chat') {
		console.log('no state');
		return false;
	}

	if (isExpired(date)) {
		console.log('state expired');
		await clearChatState(chatId);
		return false;
	}

	if (state === 'addGoals') {
		await saveGoalsAndList(text.split(','), chatId);
		await clearChatState(chatId);
	}

	if (state === 'tomorrow') {
		await saveGoalsAndList(text.split(','), chatId);
		await clearChatState(chatId);
	}

	if (state.startsWith('creatingReward')) {
		const step = parseInt(state.split('-')[1]);
		await handleCreateRewardStep(chatId, step, args[0], text);
	}

	return true;

}
exports.handleChatState = handleChatState;

async function shouldCancel(chatId, text) {
	if (cancelWords.includes(text.toLowerCase())) {
		await clearChatState(chatId);
		await sendMessage(chatId, 'Reward creation cancelled.');
		return true;
	}
}