const { getGoals, updateGoals, addTicket } = require('../common/repository.js');
const { sendMessage, sendError } = require('../bot.js');
const { listGoals } = require('./listHandler.js');

async function completeGoals(text, chatId) {
	const indexText = text.replace('/complete', '').trim();
	if (!indexText) {
		await sendMessage(chatId, 'Send the goal numbers to mark as complete (separated by spaces).');
		bot.once('message', async (msg) => {
			const indexes = msg.text.split(' ').map(n => parseInt(n.trim()) - 1);
			await markGoalsAsComplete(indexes, chatId);
		});
	} else {
		const indexes = indexText.split(' ').map(n => parseInt(n.trim()) - 1);
		await markGoalsAsComplete(indexes, chatId);
	}
}
exports.completeGoals = completeGoals;

async function markGoalsAsComplete(indexes, chatId) {
	try {
		const goals = await getGoals(chatId);
		let updated = false;
		indexes.forEach(index => {
			if (index >= 0 && index < goals.length && !goals[index].completed) {
				goals[index].completed = true;
				updated = true;
			}
		});
		if (updated) {
			await updateGoals(chatId, goals);
			await addTicket(chatId);
			await sendMessage(chatId, 'Goals marked as completed.');
			await listGoals(chatId);
		} else {
			await sendMessage(chatId, 'No valid goals to mark as completed.');
		}
	} catch (error) {
		console.error('Error marking goals as completed:', error);
		await sendError(chatId, `Error saving goals.\n${error.message}`);
	}
}
