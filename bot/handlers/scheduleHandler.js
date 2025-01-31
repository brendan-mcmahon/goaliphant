const { getGoals, updateGoals } = require('../common/goalRepository.js');
const { isScheduledDateInTheFuture } = require('../common/utilities.js');
const { sendMessage } = require('../bot.js');

async function scheduleGoal(chatId, args) {
	const x = args.split(' ');
	const goalIndex = x[0] - 1;
	const date = x[1];

	const today = new Date();
	const [month, day] = date.split('/').map(x => parseInt(x));
	const scheduledDate = new Date(today.getFullYear(), month - 1, day);
	if (scheduledDate < today) {
		scheduledDate.setFullYear(today.getFullYear() + 1);
	}
	date = scheduledDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });

	console.log("scheduling goal", args, "turns into ", goalIndex, date);

	const goals = (await getGoals(chatId))
		.filter(g => !g.scheduled || !isScheduledDateInTheFuture(g.scheduled));
	goals[goalIndex].scheduled = date;
	await updateGoals(chatId, goals);
	await sendMessage(chatId, `Goal scheduled for ${date}.`);
}

exports.scheduleGoal = scheduleGoal;