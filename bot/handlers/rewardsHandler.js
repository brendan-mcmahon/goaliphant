const bot = require('../bot.js');
const { getRewards } = require('../common/repository.js');

async function listRewards(chatId) {
	const rewards = await getRewards(chatId);

	let rewardsMessage;

	if (rewards.length === 0) {
		rewardsMessage = "You have 0 rewards.";
	} else {
		rewardsMessage = `<b>Available Rewards:</b>\n\n`;
		rewardsMessage += rewards.map((reward, index) => {
			return `<b>${index + 1}. 🎟${reward.Cost} ${reward.Title}</b>\n<i>${reward.Description}</i>`;
		}).join('\n');
	}

	await bot.sendMessage(chatId, rewardsMessage, { parse_mode: 'HTML' });
}
exports.listRewards = listRewards;
