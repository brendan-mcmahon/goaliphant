const { sendMessage, sendError } = require('../bot.js');
const { getRewards, getReward } = require('../common/rewardRepository.js');
const { getUser, addTicket } = require('../common/userRepository.js');

async function redeemReward(chatId, rewardIndex) {
	try {
		const rewards = await getRewards(chatId);
		if (rewards.length === 0) {
			await sendMessage(chatId, "You have 0 rewards.");
			return;
		}
		if (rewardIndex < 1 || rewardIndex > rewards.length) {
			await sendMessage(chatId, `Invalid reward index. Please enter a number between 1 and ${rewards.length}.`);
			return;
		}

		console.log(rewards);
		const reward = rewards[rewardIndex - 1];
		console.log(reward);

		const rewardRecord = await getReward(chatId, reward.RewardId);
		if (!rewardRecord) {
			await sendMessage(chatId, `Reward ${rewardIndex} not found.`);
			return;
		}

		const user = await getUser(chatId);
		if (user.Tickets < reward.Cost) {
			await sendMessage(chatId, `You don't have enough tickets to redeem this reward.`);
			return;
		}
		await addTicket(chatId, -reward.Cost);
		const newTicketAmount = user.Tickets - reward.Cost;

		const partner = await getUser(rewardRecord.PartnerId);
		await sendMessage(partner.ChatId, `${user.Name} has redeemed the reward "${rewardRecord.Title}"!`);

		await sendMessage(chatId, `Reward ${rewardIndex} redeemed!\nYou have ${newTicketAmount} ticket${newTicketAmount === 1 ? '' : 's'} left.`);
	} catch (error) {
		console.error('Error redeeming reward:', error);
		await sendError(chatId, error);
	}
}

exports.redeemReward = redeemReward;