const { getGoals } = require('../common/repository.js');
const { sendMessage, sendError } = require('../bot.js');

async function listGoals(chatId) {
	try {
		console.log("listing...");
		const goals = await getGoals(chatId);
		const goalsList = goals.map((g, i) => `${i + 1}. ${g.completed ? '✅' : '⬜'} ${g.text}`).join('\n');
		await sendMessage(chatId, goalsList || 'No goals set for today.');
	} catch (error) {
		console.error('Error listing goals:', error);
		await sendError(chatId, error);
	}
}
exports.listGoals = listGoals;