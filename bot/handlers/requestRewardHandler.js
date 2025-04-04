const { sendMessage, sendError } = require('../bot.js');
const { setChatState, clearChatState, getUser } = require('../common/userRepository.js');
const { updateReward, deleteReward, getReward, insertReward } = require('../common/rewardRepository.js');

const steps = [
	createRequestReward,
	getRequestRewardTitleFromUser,
	getRequestRewardDescriptionFromUser,
	confirmRequestReward
];

async function handleRequestRewardStep(chatId, step, rewardId, partnerId, text) {
	console.log("handleRequestRewardStep", chatId, step, rewardId, partnerId, text);
	await steps[step](chatId, rewardId, partnerId, text);
}
exports.handleRequestRewardStep = handleRequestRewardStep;

async function createRequestReward(chatId) {
	try {
		await sendMessage(chatId, `Great! Let's request a new reward from your partner. I'll ask you a few questions to get the details. If you want to stop at any point, just say "cancel" or "nevermind"!`);
		const user = await getUser(chatId);
		const partner = await getUser(user.PartnerId);
		const rewardId = await insertReward(partner.ChatId);
		await setChatState(chatId, 'requestReward-1', [rewardId, partner.ChatId]);
		await sendMessage(chatId, `What is the title of the reward?`);
	} catch (error) {
		console.error('Error creating reward request:', error);
		await sendError(chatId, error);
	}
}

async function getRequestRewardTitleFromUser(chatId, rewardId, partnerId, text) {
	try {
		await updateReward(partnerId, { rewardId, title: text });
		await setChatState(chatId, 'requestReward-2', [rewardId, partnerId]);
		await sendMessage(chatId, `Great! What is the description of the reward?`);
	} catch (error) {
		console.error('Error getting reward title from user:', error);
		await sendError(chatId, error);
	}
}

async function getRequestRewardDescriptionFromUser(chatId, rewardId, partnerId, text) {
	try {
		await updateReward(partnerId, { rewardId, description: text });
		await setChatState(chatId, 'requestReward-3', [rewardId, partnerId]);
		const reward = await getReward(partnerId, rewardId);
		await sendMessage(chatId, `Got it! Here's what I have for your reward request:\n\nTitle: ${reward.Title}\nDescription: ${reward.Description}\n\nIs this correct? (yes/no)`);
	} catch (error) {
		console.error('Error getting reward description from user:', error);
		await sendError(chatId, error);
	}
}

async function confirmRequestReward(chatId, rewardId, partnerId, text) {
	try {
		if (text.toLowerCase() === 'yes' || text.toLowerCase() === 'y') {
			await sendMessage(chatId, `Your reward request has been sent to your partner!`);
			const reward = await getReward(partnerId, rewardId);
			await sendMessage(partnerId, `New reward request received:\nTitle: ${reward.Title}\nDescription: ${reward.Description}\n\nPlease reply with the ticket cost for this reward.`);
			await setChatState(partnerId, 'pricingReward', [rewardId, chatId]);
			await clearChatState(chatId);
		} else {
			await sendMessage(chatId, `Okay, let's start over.`);
			await deleteReward(partnerId, rewardId);
			await createRequestReward(chatId);
		}
	} catch (error) {
		console.error('Error confirming reward request:', error);
		await sendError(chatId, error);
	}
}

async function handlePricingReward(chatId, rewardId, requesterId, text) {
	try {
		const cost = parseInt(text.trim());
		
		if (isNaN(cost) || cost < 0) {
			await sendMessage(chatId, "Please provide a valid positive number for the ticket cost.");
			return false;
		}
		
		await updateReward(chatId, { rewardId, cost });
		
		const reward = await getReward(chatId, rewardId);
		
		await sendMessage(requesterId, `Your reward request has been priced!\n\nTitle: ${reward.Title}\nDescription: ${reward.Description}\nCost: ${reward.Cost} tickets`);
		
		await sendMessage(chatId, `You've set the cost for "${reward.Title}" to ${reward.Cost} tickets.`);
		
		await clearChatState(chatId);
		
		return true;
	} catch (error) {
		console.error('Error handling reward pricing:', error);
		await sendError(chatId, error);
		return true;
	}
}

exports.handlePricingReward = handlePricingReward;
