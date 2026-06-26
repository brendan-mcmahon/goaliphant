const { getGoals, updateGoal } = require('../common/goalRepository.js');
const { addTicket, getUser } = require('../common/userRepository.js');
const { sendMessage, sendError } = require('../bot.js');
const { listGoals } = require('./listHandler.js');
const { isScheduledDateInTheFuture } = require('../common/utilities.js');

async function completeGoals(text, chatId, ticketRecipientId) {
	const indexText = text.replace('/complete', '').trim();
	if (!indexText) {
		await sendMessage(chatId, 'You must send the goal numbers to mark as complete (separated by spaces).');
		return;
	}
	const indexes = indexText.split(' ').map(n => parseInt(n.trim()) - 1);
	await markGoalsAsComplete(indexes, chatId, ticketRecipientId);
}
exports.completeGoals = completeGoals;

async function markGoalsAsComplete(indexes, chatId, ticketRecipientId) {
	try {
		const user = await getUser(chatId);
		const partnerId = user.PartnerId;
		const goals = (await getGoals(chatId))
			.filter(g => !g.scheduled || !isScheduledDateInTheFuture(g.scheduledDate));

		let updated = false;
		const now = new Date().toISOString();

		for (const index of indexes) {
			if (index < 0 || index >= goals.length || goals[index].completed) continue;

			const goal = goals[index];

			if (goal.isRecurring) {
				await updateGoal(chatId, goal.goalId, { lastCompletedAt: now });
			} else {
				await updateGoal(chatId, goal.goalId, {
					status: 'completed',
					completed: true,
					completedAt: now
				});
			}

			if (partnerId && goal.text && goal.text[0] === '🐝') {
				sendMessage(partnerId, `Your partner has completed a 🐝 task: ${goal.text}`);
			}

			updated = true;
		}

		if (updated) {
			await addTicket(ticketRecipientId);
			await sendMessage(chatId, 'Goals marked as completed.');
			await listGoals(chatId);
		} else {
			await sendMessage(chatId, 'No valid goals to mark as completed.');
		}
	} catch (error) {
		console.error('Error marking goals as completed:', error);
		await sendError(chatId, error);
	}
}
exports.markGoalsAsComplete = markGoalsAsComplete;
