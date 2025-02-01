const { getGoals, createNewDayWithGoals } = require('./common/goalRepository');
const { getChatIds, getUser } = require('./common/userRepository');
const { getLocalDate } = require('./common/utilities');

async function rolloverGoals(chatId) {
	const yesterday = getLocalDate(-1);
	const today = getLocalDate();

	try {
		const user = await getUser(chatId);
		const previousGoals = await getGoals(chatId, yesterday);
		const todayGoals = await getGoals(chatId, today);

		const incompleteGoals = previousGoals.filter(goal => !goal.completed);
		const newGoals = [...incompleteGoals, ...todayGoals];

		await createNewDayWithGoals(chatId, user.Name, newGoals);
	} catch (error) {
		console.error('Error in rollover process:', error);
		throw error;
	}
}

exports.handler = async () => {
	console.log('Rollover triggered');
	const chatIds = await getChatIds();

	for (const chatId of chatIds) {
		await rolloverGoals(chatId);
	}

	return { statusCode: 200, body: 'Rollover completed' };
};
