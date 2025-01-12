const { getGoals, updateGoals, addTicket } = require('../common/repository.js');
const { sendMessage, sendError } = require('../bot.js');
const { listGoals } = require('./listHandler.js');

async function uncompleteGoals(text, chatId) {
	const indexText = text.replace('/uncomplete', '').trim();
	const indexes = indexText.split(' ').map(n => parseInt(n.trim()) - 1);
	try {
		const goals = await getGoals(chatId);
		let updated = false;
		indexes.forEach(index => {
			if (index >= 0 && index < goals.length && goals[index].completed) {
				goals[index].completed = false;
				updated = true;
			}
		});
		if (updated) {
			await updateGoals(chatId, goals);
			await addTicket(chatId, -1 * indexes.length);
			await sendMessage(chatId, 'Goals marked as incomplete.');
			await listGoals(chatId);
		} else {
			await sendMessage(chatId, 'No valid goals to mark as incomplete.');
		}
	} catch (error) {
		console.error('Error marking goals as incomplete:', error);
		await sendError(chatId, `Error marking goals as incomplete.\n${error.message}`);
	}
}
exports.uncompleteGoals = uncompleteGoals;