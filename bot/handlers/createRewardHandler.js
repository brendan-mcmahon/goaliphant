const { sendMessage, sendError } = require('../bot.js');
const { updateReward, setChatState, clearChatState, deleteReward, getReward, insertReward } = require('../common/repository.js');

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
		var rewardId = await insertReward(chatId);
		await setChatState(chatId, 'creatingReward-1', [rewardId]);
		await sendMessage(chatId, `What is the title of the reward?`);
	} catch (error) {
		console.error('Error creating reward:', error);
		await sendError(chatId, error);
	}
}

async function getRewardTitleFromUser(chatId, rewardId, text) {
	try {
		await updateReward(chatId, { rewardId, title: text });
		await setChatState(chatId, 'creatingReward-2', [rewardId]);
		await sendMessage(chatId, `Great! What is the description of the reward?`);
	} catch (error) {
		console.error('Error getting reward title from user:', error);
		await sendError(chatId, error);
	}
}

async function getRewardDescriptionFromUser(chatId, rewardId, text) {
	try {
		await updateReward(chatId, { rewardId, description: text });
		await setChatState(chatId, 'creatingReward-3', [rewardId]);
		await sendMessage(chatId, `Awesome! How many tickets should this reward cost?`);
	} catch (error) {
		console.error('Error getting reward description from user:', error);
		await sendError(chatId, error);
	}
}

async function getRewardCostFromUser(chatId, rewardId, text) {
	try {
		await updateReward(chatId, { rewardId, cost: parseInt(text) });
		await setChatState(chatId, 'creatingReward-4', [rewardId]);
		const newReward = await getReward(chatId, rewardId);
		// await sendMessage(chatId, `Got it! Here's what I have for the new reward:\n\nTitle: ${newReward.Title}\nDescription: ${newReward.Description}\nCost: ${newReward.Cost}🎟\n\nIs this correct?`);
		await sendMessage(chatId, JSON.stringify(newReward));
	} catch (error) {
		console.error('Error getting reward cost from user:', error);
		await sendError(chatId, error);
	}
}

async function confirmReward(chatId, rewardId, text) {
	try {
		if (text.toLowerCase() === 'yes' || text.toLowerCase() === 'y') {
			await updateReward(chatId, { rewardId, confirmed: true });
			await sendMessage(chatId, `Reward created!`);
			await clearChatState(chatId);
		} else {
			await sendMessage(chatId, `Okay, let's start over.`);
			await deleteReward(chatId, rewardId);
			await createReward(chatId);
		}
	} catch (error) {
		console.error('Error confirming reward:', error);
		await sendError(chatId, error);
	}
}