const { sendMessage, sendError } = require('../bot.js');
const { upsertReward, setChatState, clearChatState } = require('../common/repository.js');

const steps = [
	createReward,
	getRewardTitleFromUser,
	getRewardDescriptionFromUser,
	getRewardCostFromUser,
	confirmReward
]

async function handleCreateRewardStep(chatId, step, rewardId, text) {
	await steps[step](chatId, rewardId, text);
}
exports.handleCreateRewardStep = handleCreateRewardStep;

// TODO: This needs to use the partner's chatId, not the user's chatId
async function createReward(chatId) {
	try {
		await sendMessage(chatId, `Great! Let's make a new reward for your partner. I'll ask you a few questions to get the details. If you want to stop at any point, just say "cancel" or "nevermind"!`);
		var rewardId = await upsertReward(chatId, {});
		await setChatState(chatId, 'creatingReward-1', [rewardId]);
		await sendMessage(chatId, `What is the title of the reward?`);
	} catch (error) {
		await sendError(chatId, `Error creating reward.\n${error.message}`);
	}
}

async function getRewardTitleFromUser(chatId, rewardId, text) {
	try {
		await upsertReward(chatId, { rewardId, Title: text });
		await setChatState(chatId, 'creatingReward-2', [rewardId]);
		await sendMessage(chatId, `Great! What is the description of the reward?`);
	} catch (error) {
		await sendError(chatId, `Error setting reward title.\n${error.message}`);
	}
}

async function getRewardDescriptionFromUser(chatId, rewardId, text) {
	try {
		await upsertReward(chatId, { rewardId, Description: text });
		await setChatState(chatId, 'creatingReward-3', [rewardId]);
		await sendMessage(chatId, `Awesome! How many tickets should this reward cost?`);
	} catch (error) {
		await sendError(chatId, `Error setting reward description.\n${error.message}`);
	}
}

async function getRewardCostFromUser(chatId, rewardId, text) {
	try {
		await upsertReward(chatId, { rewardId, Cost: parseInt(text) });
		await setChatState(chatId, 'creatingReward-4', [rewardId]);
		await sendMessage(chatId, `Got it! Here's what I have for the new reward:\n\nTitle: ${text}\nDescription: ${text}\nCost: ${text}🎟\n\nIs this correct?`);
	} catch (error) {
		await sendError(chatId, `Error setting reward cost.\n${error.message}`);
	}
}

async function confirmReward(chatId, rewardId, text) {
	try {
		if (text.toLowerCase() === 'yes' || text.toLowerCase() === 'y') {
			await upsertReward(chatId, { rewardId, confirmed: true });
			await sendMessage(chatId, `Reward created!`);
		} else {
			await sendMessage(chatId, `Okay, let's start over.`);
			await createReward(chatId);
			await clearChatState(chatId);
		}
	} catch (error) {
		await sendError(chatId, `Error confirming reward.\n${error.message}`);
	}
}