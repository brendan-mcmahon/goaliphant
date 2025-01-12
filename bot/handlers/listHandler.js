const { getGoals } = require('./common/repository.js');
const { bot } = require('../bot.js');

async function listGoals(chatId) {
	try {
		const goals = await getGoals(chatId);
		const goalsList = goals.map((g, i) => `${i + 1}. ${g.completed ? '✅' : '⬜'} ${g.text}`).join('\n');
		await bot.sendMessage(chatId, goalsList || 'No goals set for today.');
	} catch (error) {
		await bot.sendMessage(chatId, 'Error fetching goals.');
	}
}
exports.listGoals = listGoals;