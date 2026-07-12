const { getGoals, updateGoal } = require('../common/goalRepository.js');
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
		let deductCount = 0;

		for (const index of indexes) {
			if (!Number.isInteger(index) || index < 0 || index >= goals.length) continue;
			if (!goals[index].completed) continue;

			const goal = goals[index];

			if (goal.isRecurring) {
				await updateGoal(chatId, goal.goalId, { lastCompletedAt: null });
			} else {
				await updateGoal(chatId, goal.goalId, {
					status: 'active',
					completed: false,
					completedAt: null
				});
			}

			updated = true;
			deductCount++;
		}

		if (updated) {
			await addTicket(chatId, -1 * deductCount);
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
