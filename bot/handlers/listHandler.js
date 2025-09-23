const { getGoals } = require('../common/goalRepository.js');
const { getUser } = require('../common/userRepository.js');
const { sendMessage, sendError } = require('../bot.js');
const { isScheduledDateInTheFuture } = require('../common/utilities.js');
const { shouldShowRecurringGoalToday } = require('../common/cronUtils.js');

// Helper function to format due date indicators
function formatDueDateIndicator(dueDate) {
	if (!dueDate) return '';

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const due = new Date(dueDate);
	due.setHours(0, 0, 0, 0);

	const diffTime = due - today;
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		const daysPast = Math.abs(diffDays);
		return `⚠️ OVERDUE (${daysPast} day${daysPast === 1 ? '' : 's'})`;
	} else if (diffDays === 0) {
		return '📅 Due Today';
	} else if (diffDays === 1) {
		return '📅 Due Tomorrow';
	} else {
		const dateStr = due.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
		return `📅 Due ${dateStr}`;
	}
}

async function listGoals(chatId, args) {
	try {
		console.log("listing goals for ...", chatId, args);
		const goals = await getGoals(chatId);
		console.log("goals:", goals);

		const filter = args?.toLowerCase() || 'today';
		console.log("filter:", filter);

		let filteredGoals = goals;
		let messagePrefix = '';

		switch (filter) {
			case 'all':
				console.log("listing all goals");
				messagePrefix = 'All goals:';
				break;

			case 'todo':
				console.log("listing todo goals");
				filteredGoals = goals.filter(g => !g.completed);
				filteredGoals = filteredGoals.filter(g =>
					(!g.scheduled || !isScheduledDateInTheFuture(g.scheduledDate)) ||
					(g.isRecurring && shouldShowRecurringGoalToday(g))
				);
				messagePrefix = 'To-do goals:';
				break;

			case 'done':
				console.log("listing done goals");
				filteredGoals = goals.filter(g => g.completed);
				filteredGoals = filteredGoals.filter(g =>
					(!g.scheduled || !isScheduledDateInTheFuture(g.scheduledDate))
				);
				messagePrefix = 'Completed goals:';
				break;

			case 'scheduled':
				console.log("listing scheduled goals");
				filteredGoals = goals.filter(g => g.scheduled && isScheduledDateInTheFuture(g.scheduledDate));
				messagePrefix = 'Scheduled goals:';
				break;

			case 'today':
			default:
				console.log("listing today's goals");
				filteredGoals = goals.filter(g =>
					(!g.scheduled || !isScheduledDateInTheFuture(g.scheduledDate)) ||
					(g.isRecurring && shouldShowRecurringGoalToday(g))
				);
				messagePrefix = 'Today\'s goals:';
		}

		// Sort goals to prioritize overdue items first
		filteredGoals.sort((a, b) => {
			// Helper to get priority score (lower = higher priority)
			const getPriority = (goal) => {
				if (!goal.dueDate) return 3; // No due date = lowest priority

				const today = new Date();
				today.setHours(0, 0, 0, 0);
				const due = new Date(goal.dueDate);
				due.setHours(0, 0, 0, 0);
				const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));

				if (diffDays < 0 && !goal.completed) return 0; // Overdue = highest priority
				if (diffDays === 0) return 1; // Due today = high priority
				if (diffDays === 1) return 2; // Due tomorrow = medium priority
				return 3; // Future dates = normal priority
			};

			const priorityA = getPriority(a);
			const priorityB = getPriority(b);

			if (priorityA !== priorityB) return priorityA - priorityB;

			// If same priority, sort by due date
			if (a.dueDate && b.dueDate) {
				return new Date(a.dueDate) - new Date(b.dueDate);
			}

			return 0;
		});

		const goalsList = filteredGoals.map((g, i) => {
			let goalText = g.completed ? '✅' : '⬜';

			// Add due date indicator first (most important)
			const dueDateIndicator = formatDueDateIndicator(g.dueDate);
			if (dueDateIndicator) {
				goalText = `${goalText} ${dueDateIndicator}`;
			}

			if (g.scheduled) {
				goalText = `${goalText} 🗓️ ${g.scheduled}`;
			}

			if (g.isRecurring) {
				goalText = `${goalText} 🔄`;
			}

			return `${i + 1}. ${goalText} ${g.text}`;
		}).join('\n');
		console.log("goalsList:", goalsList);

		await sendMessage(chatId, `${messagePrefix}\n${goalsList || 'No goals found.'}`);
	} catch (error) {
		console.error('Error listing goals:', error);
		await sendError(chatId, error);
	}
}
exports.listGoals = listGoals;

async function listPartner(chatId) {
	try {
		console.log("listing partner...");
		const user = await getUser(chatId);
		const partnerId = user.PartnerId;
		console.log("partnerId:", partnerId);
		
		if (!partnerId) {
			await sendMessage(chatId, 'No partner set up. Ask your partner to share their chat ID.');
			return;
		}
		
		const goals = await getGoals(partnerId);
		const goalsList = goals
			.filter(g => !g.scheduled || !isScheduledDateInTheFuture(g.scheduledDate))
			.map((g, i) => `${i + 1}. ${g.completed ? '✅' : '⬜'} ${g.text}`).join('\n');
		await sendMessage(chatId, goalsList || 'No goals set for partner today.');
	} catch (error) {
		console.error('Error listing partner goals:', error);
		await sendError(chatId, error);
	}
}
exports.listPartner = listPartner;
