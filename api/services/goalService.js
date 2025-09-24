const { getGoals, updateGoals, getAllGoals } = require('../common/goalRepository');
const { getUser } = require('../common/userRepository');
const { shouldShowRecurringGoalToday } = require('../common/cronUtils');
const { isScheduledDateInTheFuture } = require('../common/utilities');

/*
 * INDEXING CONVENTION: 
 * 
 * This service uses 0-BASED indexing throughout (fixed December 2024).
 * 
 * API CALLS:
 * - POST /api/v1/goals/0/complete   // Complete first goal
 * - DELETE /api/v1/goals/0          // Delete first goal
 * - PUT /api/v1/goals/0             // Edit first goal
 * 
 * UI CONVERSION:
 * - Bot handlers convert user input: parseInt(userInput) - 1
 * - Web UI should do the same: goalNumber - 1
 * - Users see 1-based, API uses 0-based
 * 
 * ALL METHODS NOW USE CONSISTENT 0-BASED VALIDATION:
 * - if (index < 0 || index >= goals.length)
 */

// Helper function to normalize goal objects for consistent API responses
function normalizeGoal(goal) {
	return {
		...goal,
		dueDate: goal.dueDate || null,
		scheduledDate: goal.scheduledDate || null,
		recurring: goal.recurring || null
	};
}

class GoalService {
	async addGoal(chatId, text, options = {}) {
		const goals = await getGoals(chatId);
		const newGoal = {
			text,
			completed: false,
			createdAt: new Date().toISOString(),
			...options
		};

		if (options.isHoney) {
			const user = await getUser(chatId);
			if (user.Partner) {
				const partnerGoals = await getGoals(user.Partner);
				partnerGoals.push({ ...newGoal, isHoney: true, fromPartner: chatId });
				await updateGoals(user.Partner, partnerGoals);
				return { goal: newGoal, addedTo: 'partner' };
			}
			throw new Error('No partner linked');
		}

		goals.push(newGoal);
		await updateGoals(chatId, goals);
		return { goal: newGoal, addedTo: 'self' };
	}

	async addMultipleGoals(chatId, goalObjects) {
		const goals = await getGoals(chatId);
		const newGoals = goalObjects.map(goalData => {
			// Support both string and object formats for backward compatibility
			const goalText = typeof goalData === 'string' ? goalData : goalData.text;
			const goalOptions = typeof goalData === 'string' ? {} : goalData;

			return {
				text: goalText.trim(),
				completed: false,
				createdAt: new Date().toISOString(),
				...goalOptions
			};
		}).filter(g => g.text.length > 0);

		goals.push(...newGoals);
		await updateGoals(chatId, goals);
		return newGoals;
	}

	async editGoal(chatId, index, text) {
		const goals = await getGoals(chatId);

		if (index < 0 || index >= goals.length) {
			throw new Error(`Invalid goal index: ${index}`);
		}

		goals[index].text = text;
		goals[index].updatedAt = new Date().toISOString();
		await updateGoals(chatId, goals);
		return normalizeGoal(goals[index]);
	}

	async deleteGoal(chatId, index) {
		const goals = await getGoals(chatId);

		if (index < 0 || index >= goals.length) {
			throw new Error(`Invalid goal index: ${index}`);
		}

		const deletedGoal = goals.splice(index, 1)[0];
		await updateGoals(chatId, goals);
		return normalizeGoal(deletedGoal);
	}

	async deleteMultipleGoals(chatId, indices) {
		const goals = await getGoals(chatId);
		const deletedGoals = [];

		// Sort indices in descending order to avoid index shifting issues
		const sortedIndices = [...indices].sort((a, b) => b - a);

		for (const index of sortedIndices) {
			if (index >= 0 && index < goals.length) {
				deletedGoals.push(goals.splice(index, 1)[0]);
			}
		}

		await updateGoals(chatId, goals);
		return deletedGoals;
	}

	async completeGoal(chatId, index) {
		const goals = await getGoals(chatId);

		if (index < 0 || index >= goals.length) {
			throw new Error(`Invalid goal index: ${index}`);
		}

		goals[index].completed = true;
		goals[index].completedAt = new Date().toISOString();
		await updateGoals(chatId, goals);

		// Return the completed goal and ticket info
		return {
			goal: normalizeGoal(goals[index]),
			ticketAwarded: !goals[index].isHoney // Don't award tickets for honey-do tasks
		};
	}

	async completeMultipleGoals(chatId, indices) {
		const goals = await getGoals(chatId);
		const completedGoals = [];
		let ticketsAwarded = 0;

		for (const index of indices) {
			if (index >= 0 && index < goals.length) {
				goals[index].completed = true;
				goals[index].completedAt = new Date().toISOString();
				completedGoals.push(goals[index]);

				if (!goals[index].isHoney) {
					ticketsAwarded++;
				}
			}
		}

		await updateGoals(chatId, goals);
		return { completedGoals, ticketsAwarded };
	}

	async uncompleteGoal(chatId, index) {
		const goals = await getGoals(chatId);

		if (index < 0 || index >= goals.length) {
			throw new Error(`Invalid goal index: ${index}`);
		}

		const wasCompleted = goals[index].completed;
		goals[index].completed = false;
		delete goals[index].completedAt;
		await updateGoals(chatId, goals);

		return {
			goal: normalizeGoal(goals[index]),
			ticketDeducted: wasCompleted && !goals[index].isHoney
		};
	}

	async uncompleteMultipleGoals(chatId, indices) {
		const goals = await getGoals(chatId);
		const uncompletedGoals = [];
		let ticketsDeducted = 0;

		for (const index of indices) {
			if (index >= 0 && index < goals.length && goals[index].completed) {
				goals[index].completed = false;
				delete goals[index].completedAt;
				uncompletedGoals.push(goals[index]);

				if (!goals[index].isHoney) {
					ticketsDeducted++;
				}
			}
		}

		await updateGoals(chatId, goals);
		return { uncompletedGoals, ticketsDeducted };
	}

	async moveGoal(chatId, fromIndex, toIndex) {
		const goals = await getGoals(chatId);

		if (fromIndex < 0 || fromIndex >= goals.length) {
			throw new Error(`Invalid source index: ${fromIndex}`);
		}
		if (toIndex < 0 || toIndex >= goals.length) {
			throw new Error(`Invalid destination index: ${toIndex}`);
		}

		const [movedGoal] = goals.splice(fromIndex, 1);
		goals.splice(toIndex, 0, movedGoal);
		await updateGoals(chatId, goals);

		return { movedGoal, newPosition: toIndex };
	}

	async swapGoals(chatId, index1, index2) {
		const goals = await getGoals(chatId);

		if (index1 < 0 || index1 >= goals.length) {
			throw new Error(`Invalid index: ${index1}`);
		}
		if (index2 < 0 || index2 >= goals.length) {
			throw new Error(`Invalid index: ${index2}`);
		}

		[goals[index1], goals[index2]] = [goals[index2], goals[index1]];
		await updateGoals(chatId, goals);

		return { swapped: [normalizeGoal(goals[index1]), normalizeGoal(goals[index2])] };
	}

	async scheduleGoal(chatId, index, date) {
		const goals = await getGoals(chatId);

		if (index < 0 || index >= goals.length) {
			throw new Error(`Invalid goal index: ${index}`);
		}

		goals[index].scheduledDate = date;
		await updateGoals(chatId, goals);
		return normalizeGoal(goals[index]);
	}

	async unscheduleGoal(chatId, index) {
		const goals = await getGoals(chatId);

		if (index < 0 || index >= goals.length) {
			throw new Error(`Invalid goal index: ${index}`);
		}

		delete goals[index].scheduledDate;
		await updateGoals(chatId, goals);
		return normalizeGoal(goals[index]);
	}

	async setDueDate(chatId, index, dueDate) {
		const goals = await getGoals(chatId);

		if (index < 0 || index >= goals.length) {
			throw new Error(`Invalid goal index: ${index}`);
		}

		goals[index].dueDate = dueDate;
		goals[index].updatedAt = new Date().toISOString();
		await updateGoals(chatId, goals);
		return normalizeGoal(goals[index]);
	}

	async clearDueDate(chatId, index) {
		const goals = await getGoals(chatId);

		if (index < 0 || index >= goals.length) {
			throw new Error(`Invalid goal index: ${index}`);
		}

		delete goals[index].dueDate;
		goals[index].updatedAt = new Date().toISOString();
		await updateGoals(chatId, goals);
		return normalizeGoal(goals[index]);
	}

	async addNoteToGoal(chatId, index, note) {
		const goals = await getGoals(chatId);

		if (index < 0 || index >= goals.length) {
			throw new Error(`Invalid goal index: ${index}`);
		}

		if (!goals[index].notes) {
			goals[index].notes = [];
		}

		goals[index].notes.push({
			text: note,
			createdAt: new Date().toISOString()
		});

		await updateGoals(chatId, goals);
		return normalizeGoal(goals[index]);
	}

	async makeGoalRecurring(chatId, index, cronExpression) {
		const goals = await getGoals(chatId);

		if (index < 0 || index >= goals.length) {
			throw new Error(`Invalid goal index: ${index}`);
		}

		goals[index].recurring = cronExpression;
		await updateGoals(chatId, goals);
		return normalizeGoal(goals[index]);
	}

	async removeRecurring(chatId, index) {
		const goals = await getGoals(chatId);

		if (index < 0 || index >= goals.length) {
			throw new Error(`Invalid goal index: ${index}`);
		}

		delete goals[index].recurring;
		await updateGoals(chatId, goals);
		return normalizeGoal(goals[index]);
	}

	async listGoals(chatId, options = {}) {
		const goals = await getGoals(chatId);
		let filteredGoals = [...goals];

		// Filter by completion status
		if (options.completed !== undefined) {
			// Convert string to boolean for comparison
			const completedFilter = options.completed === 'true' || options.completed === true;
			filteredGoals = filteredGoals.filter(g => g.completed === completedFilter);
		}

		// Filter for today's goals
		if (options.today === 'true' || options.today === true) {
			filteredGoals = filteredGoals.filter(goal => {
				// Check if scheduled for future
				if (goal.scheduledDate && isScheduledDateInTheFuture(goal.scheduledDate)) {
					return false;
				}

				// Check recurring goals
				if (goal.recurring && !shouldShowRecurringGoalToday(goal.recurring)) {
					return false;
				}

				return true;
			});
		}

		// Filter by scheduled status
		if (options.scheduled !== undefined) {
			const scheduledFilter = options.scheduled === 'true' || options.scheduled === true;
			filteredGoals = filteredGoals.filter(g =>
				scheduledFilter ? g.scheduledDate : !g.scheduledDate
			);
		}

		// Filter by recurring status
		if (options.recurring !== undefined) {
			const recurringFilter = options.recurring === 'true' || options.recurring === true;
			filteredGoals = filteredGoals.filter(g =>
				recurringFilter ? g.recurring : !g.recurring
			);
		}

		// Filter by due date
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (options.dueBefore) {
			const beforeDate = new Date(options.dueBefore);
			filteredGoals = filteredGoals.filter(g =>
				g.dueDate && new Date(g.dueDate) < beforeDate
			);
		}

		if (options.dueAfter) {
			const afterDate = new Date(options.dueAfter);
			filteredGoals = filteredGoals.filter(g =>
				g.dueDate && new Date(g.dueDate) > afterDate
			);
		}

		if (options.overdue === 'true' || options.overdue === true) {
			filteredGoals = filteredGoals.filter(g =>
				g.dueDate && new Date(g.dueDate) < today && !g.completed
			);
		}

		// Sort by due date if any due date filters are applied
		if (options.dueBefore || options.dueAfter || options.overdue || options.sortByDueDate) {
			filteredGoals.sort((a, b) => {
				// Goals without due dates go to the end
				if (!a.dueDate && !b.dueDate) return 0;
				if (!a.dueDate) return 1;
				if (!b.dueDate) return -1;

				// Sort by due date ascending
				return new Date(a.dueDate) - new Date(b.dueDate);
			});
		}

		// Normalize goals to ensure consistent API response format
		return filteredGoals.map(normalizeGoal);
	}

	async listPartnerGoals(chatId) {
		const user = await getUser(chatId);

		if (!user.Partner) {
			throw new Error('No partner linked');
		}

		const partnerGoals = await getGoals(user.Partner);
		return partnerGoals.filter(g => !g.completed).map(normalizeGoal);
	}

	async getGoalDetails(chatId, index) {
		const goals = await getGoals(chatId);

		if (index < 0 || index >= goals.length) {
			throw new Error(`Invalid goal index: ${index}`);
		}

		return normalizeGoal(goals[index]);
	}

	async getAllUsersGoals() {
		return await getAllGoals();
	}
}

module.exports = new GoalService();