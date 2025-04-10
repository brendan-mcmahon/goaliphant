const { getGoals, updateGoals } = require('../common/goalRepository.js');
const { isScheduledDateInTheFuture } = require('../common/utilities.js');
const { sendMessage } = require('../bot.js');

async function scheduleGoal(chatId, args) {
	if (!args) {
		await sendMessage(chatId, "No goal index or date provided.");
		return;
	}

	const x = args.split(' ');
	const goalIndex = x[0] - 1;
	const date = x[1];

	const today = new Date();
	const [month, day] = date.split('/').map(x => parseInt(x));
	const scheduledDate = new Date(today.getFullYear(), month - 1, day);
	if (scheduledDate < today) {
		scheduledDate.setFullYear(today.getFullYear() + 1);
	}
	const longDate = scheduledDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

	console.log("scheduling goal", args, "turns into ", goalIndex, longDate);

	const goals = await getGoals(chatId);

	const visibleGoals = goals.filter(g => !g.scheduled || !isScheduledDateInTheFuture(g.scheduled));

	if (goalIndex < 0 || goalIndex >= visibleGoals.length) {
		await sendMessage(chatId, "Invalid goal index.");
		return;
	}

	const targetGoal = visibleGoals[goalIndex];
	const actualIndex = goals.findIndex(g => g === targetGoal);

	if (actualIndex !== -1) {
		goals[actualIndex].scheduled = longDate;
		await updateGoals(chatId, goals);
		await sendMessage(chatId, `Goal scheduled for ${longDate}.`);
	} else {
		await sendMessage(chatId, "Error scheduling goal.");
	}
}

exports.scheduleGoal = scheduleGoal;

async function unscheduleGoal(chatId, goalIndex) {
	const goals = await getGoals(chatId);
	const goal = goals[goalIndex];
	if (!goal) {
		await sendMessage(chatId, "Invalid goal index.");
		return;
	}

	goal.scheduled = null;
	await updateGoals(chatId, goals);
	await sendMessage(chatId, `Goal unscheduled: ${goal.text}`);
}

exports.unscheduleGoal = unscheduleGoal;
