const { sendMessage, sendError } = require('../bot.js');
const { getRewards } = require('../common/repository.js');

const banner = `
*************************************************************************
*                                                                       *
*	    ███████████  ███████████   █████ ███████████ ██████████         *
*	   ░░███░░░░░███░░███░░░░░███ ░░███ ░█░░░░░░███ ░░███░░░░░█         *
*	    ░███    ░███ ░███    ░███  ░███ ░     ███░   ░███  █ ░          *
*	    ░██████████  ░██████████   ░███      ███     ░██████            *
*	    ░███░░░░░░   ░███░░░░░███  ░███     ███      ░███░░█            *
*	    ░███         ░███    ░███  ░███   ████     █ ░███ ░   █         *
*	    █████        █████   █████ █████ ███████████ ██████████         *
*	   ░░░░░        ░░░░░   ░░░░░ ░░░░░ ░░░░░░░░░░░ ░░░░░░░░░░          *
*   ███████████     ███████       ███████    ███████████ █████   █████  *
*  ░░███░░░░░███  ███░░░░░███   ███░░░░░███ ░█░░░███░░░█░░███   ░░███   *
*   ░███    ░███ ███     ░░███ ███     ░░███░   ░███  ░  ░███    ░███   *
*   ░██████████ ░███      ░███░███      ░███    ░███     ░███████████   *
*   ░███░░░░░███░███      ░███░███      ░███    ░███     ░███░░░░░███   *
*   ░███    ░███░░███     ███ ░░███     ███     ░███     ░███    ░███   *
*   ███████████  ░░░███████░   ░░░███████░      █████    █████   █████  *
*  ░░░░░░░░░░░     ░░░░░░░       ░░░░░░░       ░░░░░    ░░░░░   ░░░░░   *
*                                                                       *
*************************************************************************`;

async function listRewards(chatId) {
	try {
		const rewards = await getRewards(chatId);

		let rewardsMessage;

		if (rewards.length === 0) {
			rewardsMessage = "You have 0 rewards.";
		} else {
			rewardsMessage = rewards.map((reward, index) => {
				return `<b>${index + 1}. ${reward.Title}</b> | ${reward.Cost} 🎟\n<i>${reward.Description}</i>`;
			}).join('\n');
		}
		await sendMessage(chatId, banner);
		await sendMessage(chatId, rewardsMessage, { parse_mode: 'HTML' });
		console.log("Rewards listed");
	} catch (error) {
		console.error('Error listing rewards:', error);
		await sendError(chatId, error);
	}
}
exports.listRewards = listRewards;
