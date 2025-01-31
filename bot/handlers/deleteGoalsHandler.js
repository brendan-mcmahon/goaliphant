const { sendMessage, sendError } = require('../bot.js');
const { getGoals, updateGoals } = require('../common/goalRepository.js');
const { listGoals } = require('./listHandler.js');
const { isScheduledDateInTheFuture } = require('../common/utilities.js');

async function deleteGoals(text, chatId) {
	const indexText = text.replace('/delete', '').trim();
	if (!indexText) {
		await sendMessage(chatId, 'Send the goal numbers to delete (separated by spaces).');
	} else {
		const indexes = indexText.split(' ').map(n => parseInt(n.trim()) - 1);
		await removeGoals(indexes, chatId);
	}
}
exports.deleteGoals = deleteGoals;

async function removeGoals(indexes, chatId) {
	try {
		const goals = (await getGoals(chatId)).filter(g => !g.scheduled || !isScheduledDateInTheFuture(g.scheduled));
		let updated = false;
		indexes.sort((a, b) => b - a).forEach(index => {
			if (index >= 0 && index < goals.length) {
				goals.splice(index, 1);
				updated = true;
			}
		});
		if (updated) {
			await updateGoals(chatId, goals);
			await sendMessage(chatId, 'Goals deleted successfully.');
			await listGoals(chatId);
		} else {
			await sendMessage(chatId, 'No valid goals to delete.');
		}
	} catch (error) {
		console.error('Error deleting goals:', error);
		await sendError(chatId, error);
	}
}