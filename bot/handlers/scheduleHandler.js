const { getGoals, updateGoal } = require('../common/goalRepository.js');
const { isScheduledDateInTheFuture } = require('../common/utilities.js');
const { sendMessage } = require('../bot.js');

async function scheduleGoal(chatId, args) {
	if (!args) {
		await sendMessage(chatId, 'No goal index or date provided.');
		return;
	}

	const parts = args.split(' ');
	const goalIndex = parseInt(parts[0]) - 1;
	const date = parts[1];

	if (!date) {
		await sendMessage(chatId, 'No date provided. Use format: /schedule {index} {MM/DD}');
		return;
	}

	const today = new Date();
	const [month, day] = date.split('/').map(x => parseInt(x));
	const scheduledDate = new Date(today.getFullYear(), month - 1, day);
	if (scheduledDate < today) {
		scheduledDate.setFullYear(today.getFullYear() + 1);
	}
	const longDate = scheduledDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

	try {
		const goals = await getGoals(chatId);
		const visibleGoals = goals.filter(g => !g.scheduled || !isScheduledDateInTheFuture(g.scheduledDate));

		if (goalIndex < 0 || goalIndex >= visibleGoals.length) {
			await sendMessage(chatId, 'Invalid goal index.');
			return;
		}

		const goal = visibleGoals[goalIndex];
		await updateGoal(chatId, goal.goalId, {
			scheduled: true,
			scheduledDate: longDate
		});
		await sendMessage(chatId, `Goal scheduled for ${longDate}.`);
	} catch (error) {
		console.error('Error scheduling goal:', error);
		await sendMessage(chatId, '❌ Error scheduling goal. Please try again.');
	}
}
exports.scheduleGoal = scheduleGoal;

async function unscheduleGoal(chatId, goalIndex) {
	try {
		const goals = await getGoals(chatId);
		goalIndex = parseInt(goalIndex) - 1;
		const goal = goals[goalIndex];
		if (!goal) {
			await sendMessage(chatId, 'Invalid goal index.');
			return;
		}
		await updateGoal(chatId, goal.goalId, { scheduled: null, scheduledDate: null });
		await sendMessage(chatId, `Goal unscheduled: ${goal.text}`);
	} catch (error) {
		console.error('Error unscheduling goal:', error);
		await sendMessage(chatId, '❌ Error unscheduling goal. Please try again.');
	}
}
exports.unscheduleGoal = unscheduleGoal;
