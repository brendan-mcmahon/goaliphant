const { getGoals, updateGoals } = require('../common/goalRepository.js');
const { sendMessage } = require('../bot.js');

async function scheduleGoal(chatId, args) {
	// the args come like this: "{goal index} {mm/dd}" so we need to parse that string out
	const x = args.split(' ');
	const goalIndex = x[0] - 1;
	const date = x[1];

	console.log("scheduling goal", args, "turns into ", goalIndex, date);

	const goals = await getGoals(chatId)
		.filter(g => !g.scheduled || !isScheduledDateInTheFuture(g.scheduled));
	goals[goalIndex].schedule = date;
	await updateGoals(chatId, goals);
	await sendMessage(chatId, `Goal scheduled for ${date}.`);
}

exports.scheduleGoal = scheduleGoal;