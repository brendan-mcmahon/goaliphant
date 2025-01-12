const bot = require('../bot.js');
const { addReward, getRewards } = require('../common/repository.js');

async function listRewards(chatId) {
	const rewards = await getRewards(chatId);

	let rewardsMessage;

	if (rewards.length === 0) {
		rewardsMessage = "You have 0 rewards.";
	} else {
		rewardsMessage = `<b>Available Rewards:</b>\n\n`;
		rewardsMessage += rewards.map((reward, index) => {
			const availability = reward.IsAvailable ? "✅ Available" : "❌ Unavailable";
			return `<b>${index + 1}. ${reward.title}</b>\n<i>${reward.description}</i>\nCost: <b>${reward.cost} tickets</b>\nType: <b>${reward.type}</b>\nStatus: ${availability}\n`;
		}).join('\n');
	}

	await bot.sendMessage(chatId, rewardsMessage, { parse_mode: 'HTML' });
}
exports.listRewards = listRewards;

async function createReward(chatId, reward) {
	await addReward(chatId, reward);
	await bot.sendMessage(chatId, 'Reward added.');
}
exports.createReward = createReward;