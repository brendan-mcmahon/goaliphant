const { getGoals, updateGoal } = require('../common/goalRepository.js');
const { listGoals } = require('./listHandler.js');
const { sendMessage, sendError } = require('../bot.js');

async function editGoal(index, text, chatId) {
	index = parseInt(index) - 1;
	if (!text) {
		await sendMessage(chatId, 'You must send new text to replace the existing text!');
		return;
	}
	try {
		const goals = await getGoals(chatId);
		if (index < 0 || index >= goals.length) {
			await sendMessage(chatId, 'Invalid goal index!');
			return;
		}
		await updateGoal(chatId, goals[index].goalId, {
			text: text.trim(),
			updatedAt: new Date().toISOString()
		});
		await sendMessage(chatId, 'Goal updated successfully!');
		await listGoals(chatId);
	} catch (error) {
		console.error('Error editing goal:', error);
		await sendError(chatId, error);
	}
}
exports.editGoal = editGoal;
