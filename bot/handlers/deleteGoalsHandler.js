const { sendMessage, sendError } = require('../bot.js');
const { getGoals, deleteGoal, getGoalBySharedId } = require('../common/goalRepository.js');
const { getUser } = require('../common/userRepository.js');
const { listGoals } = require('./listHandler.js');
const { isScheduledDateInTheFuture } = require('../common/utilities.js');

async function deleteGoals(text, chatId) {
	const indexText = text.replace('/delete', '').trim();
	if (!indexText) {
		await sendMessage(chatId, 'Send the goal numbers to delete (separated by spaces).');
		return;
	}
	const indexes = indexText.split(' ').map(n => parseInt(n.trim()) - 1);
	await removeGoals(indexes, chatId);
}
exports.deleteGoals = deleteGoals;

async function removeGoals(indexes, chatId) {
	try {
		const goals = (await getGoals(chatId))
			.filter(g => !g.scheduled || !isScheduledDateInTheFuture(g.scheduledDate));

		const toDelete = indexes
			.sort((a, b) => b - a)
			.filter(i => i >= 0 && i < goals.length)
			.map(i => goals[i]);

		if (toDelete.length === 0) {
			await sendMessage(chatId, 'No valid goals to delete.');
			return;
		}

		const user = await getUser(chatId);
		const partnerId = user?.PartnerId;

		await Promise.all(toDelete.map(async g => {
			await deleteGoal(chatId, g.goalId);
			if (g.sharedGoalId && partnerId) {
				const partnerGoal = await getGoalBySharedId(partnerId, g.sharedGoalId);
				if (partnerGoal) {
					await deleteGoal(partnerId, partnerGoal.goalId);
					sendMessage(partnerId, `🤝 A shared goal was removed: ${g.text}`);
				}
			}
		}));
		await sendMessage(chatId, 'Goals deleted successfully.');
		await listGoals(chatId);
	} catch (error) {
		console.error('Error deleting goals:', error);
		await sendError(chatId, error);
	}
}
exports.removeGoals = removeGoals;
