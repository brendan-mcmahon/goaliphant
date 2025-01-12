const { getGoals } = require('../common/repository.js');
const { sendMessage, sendError } = require('../bot.js');

async function listGoals(chatId) {
	try {
		const goals = await getGoals(chatId);
		const goalsList = goals.map((g, i) => `${i + 1}. ${g.completed ? '✅' : '⬜'} ${g.text}`).join('\n');
		await sendMessage(chatId, goalsList || 'No goals set for today.');
	} catch (error) {
		await sendError(chatId, `Error fetching goals.\n${error.message}`);
	}
}
exports.listGoals = listGoals;