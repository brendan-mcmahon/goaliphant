const { getGoals, updateGoals } = require('../common/goalRepository.js');
const { addTicket } = require('../common/userRepository.js');
const { sendMessage, sendError } = require('../bot.js');
const { listGoals } = require('./listHandler.js');
const { isScheduledDateInTheFuture } = require('../common/utilities.js');

async function uncompleteGoals(text, chatId) {
	const indexText = text.replace('/uncomplete', '').trim();
	const indexes = indexText.split(' ').map(n => parseInt(n.trim()) - 1);
	try {
		const goals = (await getGoals(chatId))
			.filter(g => !g.scheduled || !isScheduledDateInTheFuture(g.scheduledDate));
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
		await sendError(chatId, error);
	}
}
exports.uncompleteGoals = uncompleteGoals;