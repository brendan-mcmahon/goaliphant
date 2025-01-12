const { sendMessage, sendError } = require('../bot.js');
const { upsertReward, setChatState } = require('../common/repository.js');

// TODO: This needs to use the partner's chatId, not the user's chatId
async function createReward(chatId) {
	try {
		await sendMessage(chatId, `Great! Let's make a new reward for your partner. I'll ask you a few questions to get the details. If you want to stop at any point, just say "cancel" or "nevermind"!`);
		var rewardId = await upsertReward(chatId, {});
		await setChatState(chatId, 'creatingReward-1', [rewardId]);
	} catch (error) {
		await sendError(chatId, `Error creating reward.\n${error.message}`);
	}

}
exports.createReward = createReward;