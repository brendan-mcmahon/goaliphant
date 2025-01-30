const { getGoals } = require('../common/goalRepository.js');
const { sendMessage } = require('../bot.js');

async function scheduleGoal(chatId, args) {
	// the args come like this: "{goal index} {mm/dd}" so we need to parse that string out
	const x = args.split(' ');
	const goalIndex = x[0];
	const date = x[1];

	const goals = await getGoals(chatId);
	goals[goalIndex].schedule = date;
	await updateGoals(chatId, goals);
	await sendMessage(chatId, `Goal scheduled for ${date}.`);
}

exports.scheduleGoal = scheduleGoal;