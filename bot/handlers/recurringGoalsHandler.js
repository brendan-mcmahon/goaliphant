const { getGoals, updateGoal } = require('../common/goalRepository.js');
const { sendMessage, sendError } = require('../bot.js');

async function makeGoalRecurring(goalNumber, cronPattern, chatId) {
	try {
		const index = parseInt(goalNumber) - 1;

		if (isNaN(index) || index < 0) {
			await sendMessage(chatId, '⚠️ Please provide a valid goal number.');
			return;
		}

		let cronExpression = cronPattern.trim();
		const parts = cronExpression.split(/\s+/);

		if (parts.length < 3) {
			await sendMessage(chatId, '⚠️ Invalid date pattern. Please provide at least day, month, and weekday components.');
			return;
		} else if (parts.length === 3) {
			cronExpression = `* * ${cronExpression}`;
		} else if (parts.length < 5) {
			await sendMessage(chatId, '⚠️ Invalid cron expression. Please provide either 3 components (day month weekday) or the full 5 components.');
			return;
		}

		if (cronExpression.split(' ').length < 5) {
			await sendMessage(chatId, '⚠️ Invalid cron expression. Please use a valid format.');
			return;
		}

		const goals = await getGoals(chatId);

		if (!goals || goals.length === 0) {
			await sendMessage(chatId, '⚠️ You have no goals. Add some with /add');
			return;
		}

		if (index >= goals.length) {
			await sendMessage(chatId, `⚠️ You only have ${goals.length} goals. Please provide a valid number.`);
			return;
		}

		const goal = goals[index];
		await updateGoal(chatId, goal.goalId, {
			isRecurring: true,
			recurringSchedule: cronExpression
		});

		const scheduleDescription = getHumanReadableSchedule(cronExpression);
		await sendMessage(chatId, `✅ Goal "${goal.text}" is now recurring ${scheduleDescription}`);
	} catch (error) {
		console.error('Error making goal recurring:', error);
		await sendError(chatId, error);
	}
}

function getHumanReadableSchedule(cronExpression) {
	const parts = cronExpression.trim().split(/\s+/);
	const [, , day, month, weekday] = parts;

	if (day === '*' && month === '*' && weekday === '*') return 'every day';
	if (day === '*' && month === '*') {
		const map = { '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday', '0': 'Sunday' };
		if (map[weekday]) return `every ${map[weekday]}`;
		if (weekday === '1,2,3,4,5') return 'on weekdays';
		if (weekday === '0,6') return 'on weekends';
	}
	return `on schedule: ${cronExpression}`;
}

module.exports = { makeGoalRecurring };
