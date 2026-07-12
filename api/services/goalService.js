const { getGoals, addGoal, updateGoal, deleteGoal } = require('../common/goalRepository');
const { getUser } = require('../common/userRepository');
const { shouldShowRecurringGoalToday } = require('../common/cronUtils');
const { isScheduledDateInTheFuture } = require('../common/utilities');

/*
 * INDEXING CONVENTION:
 * API uses 0-BASED indexing. Users see 1-based; callers subtract 1 before calling.
 *
 * All index-based operations operate on the sorted active goals array returned by getGoals().
 */

function normalizeGoal(goal) {
	return {
		...goal,
		dueDate: goal.dueDate || null,
		scheduledDate: goal.scheduledDate || null,
		isRecurring: goal.isRecurring || false,
		recurrencePattern: goal.recurrencePattern || null
	};
}

class GoalService {
	async addGoal(chatId, text, options = {}) {
		if (options.isHoney) {
			const user = await getUser(chatId);
			if (!user.Partner) throw new Error('No partner linked');
			const goal = await addGoal(user.Partner, { text, isHoney: true, fromPartner: chatId.toString(), ...options });
			return { goal: normalizeGoal(goal), addedTo: 'partner' };
		}

		const goal = await addGoal(chatId, { text, ...options });
		return { goal: normalizeGoal(goal), addedTo: 'self' };
	}

	async addMultipleGoals(chatId, goalObjects) {
		const added = [];
		for (const goalData of goalObjects) {
			const text = typeof goalData === 'string' ? goalData : goalData.text;
			if (!text || !text.trim()) continue;
			const opts = typeof goalData === 'string' ? {} : { ...goalData };
			delete opts.text;
			const goal = await addGoal(chatId, { text: text.trim(), ...opts });
			added.push(normalizeGoal(goal));
		}
		return added;
	}

	async editGoal(chatId, index, text) {
		const goals = await getGoals(chatId);
		if (index < 0 || index >= goals.length) throw new Error(`Invalid goal index: ${index}`);

		await updateGoal(chatId, goals[index].goalId, { text, updatedAt: new Date().toISOString() });
		return normalizeGoal({ ...goals[index], text });
	}

	async deleteGoal(chatId, index) {
		const goals = await getGoals(chatId);
		if (index < 0 || index >= goals.length) throw new Error(`Invalid goal index: ${index}`);

		const goal = goals[index];
		await deleteGoal(chatId, goal.goalId);
		return normalizeGoal(goal);
	}

	async deleteMultipleGoals(chatId, indices) {
		const goals = await getGoals(chatId);
		const deleted = [];

		for (const index of [...indices].sort((a, b) => b - a)) {
			if (index < 0 || index >= goals.length) continue;
			await deleteGoal(chatId, goals[index].goalId);
			deleted.push(goals[index]);
		}

		return deleted.map(normalizeGoal);
	}

	async completeGoal(chatId, index) {
		const goals = await getGoals(chatId);
		if (index < 0 || index >= goals.length) throw new Error(`Invalid goal index: ${index}`);

		const goal = goals[index];
		const now = new Date().toISOString();

		if (goal.isRecurring) {
			await updateGoal(chatId, goal.goalId, { lastCompletedAt: now });
		} else {
			await updateGoal(chatId, goal.goalId, { status: 'completed', completed: true, completedAt: now });
		}

		return {
			goal: normalizeGoal({ ...goal, completed: true, completedAt: now }),
			ticketAwarded: !goal.isHoney
		};
	}

	async completeMultipleGoals(chatId, indices) {
		const goals = await getGoals(chatId);
		const completed = [];
		let ticketsAwarded = 0;
		const now = new Date().toISOString();

		for (const index of indices) {
			if (!Number.isInteger(index) || index < 0 || index >= goals.length) continue;
			const goal = goals[index];

			if (goal.isRecurring) {
				await updateGoal(chatId, goal.goalId, { lastCompletedAt: now });
			} else {
				await updateGoal(chatId, goal.goalId, { status: 'completed', completed: true, completedAt: now });
			}

			completed.push(goal);
			if (!goal.isHoney) ticketsAwarded++;
		}

		return { completedGoals: completed.map(normalizeGoal), ticketsAwarded };
	}

	async uncompleteGoal(chatId, index) {
		const goals = await getGoals(chatId);
		if (index < 0 || index >= goals.length) throw new Error(`Invalid goal index: ${index}`);

		const goal = goals[index];
		const wasCompleted = goal.completed;

		if (goal.isRecurring) {
			await updateGoal(chatId, goal.goalId, { lastCompletedAt: null });
		} else {
			await updateGoal(chatId, goal.goalId, { status: 'active', completed: false, completedAt: null });
		}

		return {
			goal: normalizeGoal({ ...goal, completed: false }),
			ticketDeducted: wasCompleted && !goal.isHoney
		};
	}

	async uncompleteMultipleGoals(chatId, indices) {
		const goals = await getGoals(chatId);
		const uncompleted = [];
		let ticketsDeducted = 0;

		for (const index of indices) {
			if (!Number.isInteger(index) || index < 0 || index >= goals.length) continue;
			if (!goals[index].completed) continue;
			const goal = goals[index];

			if (goal.isRecurring) {
				await updateGoal(chatId, goal.goalId, { lastCompletedAt: null });
			} else {
				await updateGoal(chatId, goal.goalId, { status: 'active', completed: false, completedAt: null });
			}

			uncompleted.push(goal);
			if (!goal.isHoney) ticketsDeducted++;
		}

		return { uncompletedGoals: uncompleted.map(normalizeGoal), ticketsDeducted };
	}

	async moveGoal(chatId, fromIndex, toIndex) {
		const goals = await getGoals(chatId);
		if (fromIndex < 0 || fromIndex >= goals.length) throw new Error(`Invalid source index: ${fromIndex}`);
		if (toIndex < 0 || toIndex >= goals.length) throw new Error(`Invalid destination index: ${toIndex}`);

		const reordered = [...goals];
		const [moved] = reordered.splice(fromIndex, 1);
		reordered.splice(toIndex, 0, moved);

		await Promise.all(reordered.map((g, i) => updateGoal(chatId, g.goalId, { displayOrder: i + 1 })));

		return { movedGoal: normalizeGoal(moved), newPosition: toIndex };
	}

	async swapGoals(chatId, index1, index2) {
		const goals = await getGoals(chatId);
		if (index1 < 0 || index1 >= goals.length) throw new Error(`Invalid index: ${index1}`);
		if (index2 < 0 || index2 >= goals.length) throw new Error(`Invalid index: ${index2}`);

		await Promise.all([
			updateGoal(chatId, goals[index1].goalId, { displayOrder: goals[index2].displayOrder }),
			updateGoal(chatId, goals[index2].goalId, { displayOrder: goals[index1].displayOrder })
		]);

		return { swapped: [normalizeGoal(goals[index1]), normalizeGoal(goals[index2])] };
	}

	async scheduleGoal(chatId, index, date) {
		const goals = await getGoals(chatId);
		if (index < 0 || index >= goals.length) throw new Error(`Invalid goal index: ${index}`);

		await updateGoal(chatId, goals[index].goalId, { scheduled: true, scheduledDate: date });
		return normalizeGoal({ ...goals[index], scheduledDate: date });
	}

	async unscheduleGoal(chatId, index) {
		const goals = await getGoals(chatId);
		if (index < 0 || index >= goals.length) throw new Error(`Invalid goal index: ${index}`);

		await updateGoal(chatId, goals[index].goalId, { scheduled: null, scheduledDate: null });
		return normalizeGoal({ ...goals[index], scheduledDate: null });
	}

	async setDueDate(chatId, index, dueDate) {
		const goals = await getGoals(chatId);
		if (index < 0 || index >= goals.length) throw new Error(`Invalid goal index: ${index}`);

		await updateGoal(chatId, goals[index].goalId, { dueDate, updatedAt: new Date().toISOString() });
		return normalizeGoal({ ...goals[index], dueDate });
	}

	async clearDueDate(chatId, index) {
		const goals = await getGoals(chatId);
		if (index < 0 || index >= goals.length) throw new Error(`Invalid goal index: ${index}`);

		await updateGoal(chatId, goals[index].goalId, { dueDate: null, updatedAt: new Date().toISOString() });
		return normalizeGoal({ ...goals[index], dueDate: null });
	}

	async addNoteToGoal(chatId, index, note) {
		const goals = await getGoals(chatId);
		if (index < 0 || index >= goals.length) throw new Error(`Invalid goal index: ${index}`);

		const goal = goals[index];
		const notes = [...(goal.notes || []), { text: note, createdAt: new Date().toISOString() }];
		await updateGoal(chatId, goal.goalId, { notes });
		return normalizeGoal({ ...goal, notes });
	}

	async makeGoalRecurring(chatId, index, cronExpression) {
		const goals = await getGoals(chatId);
		if (index < 0 || index >= goals.length) throw new Error(`Invalid goal index: ${index}`);

		await updateGoal(chatId, goals[index].goalId, { isRecurring: true, recurrencePattern: cronExpression });
		return normalizeGoal({ ...goals[index], isRecurring: true, recurrencePattern: cronExpression });
	}

	async removeRecurring(chatId, index) {
		const goals = await getGoals(chatId);
		if (index < 0 || index >= goals.length) throw new Error(`Invalid goal index: ${index}`);

		await updateGoal(chatId, goals[index].goalId, { isRecurring: null, recurrencePattern: null });
		return normalizeGoal({ ...goals[index], isRecurring: false, recurrencePattern: null });
	}

	async listGoals(chatId, options = {}) {
		let goals = await getGoals(chatId);

		if (options.completed !== undefined) {
			const completedFilter = options.completed === 'true' || options.completed === true;
			goals = goals.filter(g => g.completed === completedFilter);
		}

		if (options.today === 'true' || options.today === true) {
			goals = goals.filter(goal => {
				if (goal.scheduledDate && isScheduledDateInTheFuture(goal.scheduledDate)) return false;
				if (goal.isRecurring && !shouldShowRecurringGoalToday(goal)) return false;
				return true;
			});
		}

		if (options.scheduled !== undefined) {
			const scheduledFilter = options.scheduled === 'true' || options.scheduled === true;
			goals = goals.filter(g => scheduledFilter ? g.scheduledDate : !g.scheduledDate);
		}

		if (options.recurring !== undefined) {
			const recurringFilter = options.recurring === 'true' || options.recurring === true;
			goals = goals.filter(g => recurringFilter ? g.isRecurring : !g.isRecurring);
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (options.dueBefore) {
			const beforeDate = new Date(options.dueBefore);
			goals = goals.filter(g => g.dueDate && new Date(g.dueDate) < beforeDate);
		}

		if (options.dueAfter) {
			const afterDate = new Date(options.dueAfter);
			goals = goals.filter(g => g.dueDate && new Date(g.dueDate) > afterDate);
		}

		if (options.overdue === 'true' || options.overdue === true) {
			goals = goals.filter(g => g.dueDate && new Date(g.dueDate) < today && !g.completed);
		}

		if (options.dueBefore || options.dueAfter || options.overdue || options.sortByDueDate) {
			goals.sort((a, b) => {
				if (!a.dueDate && !b.dueDate) return 0;
				if (!a.dueDate) return 1;
				if (!b.dueDate) return -1;
				return new Date(a.dueDate) - new Date(b.dueDate);
			});
		}

		return goals.map(normalizeGoal);
	}

	async listPartnerGoals(chatId) {
		const user = await getUser(chatId);
		if (!user.Partner) throw new Error('No partner linked');

		const goals = await getGoals(user.Partner);
		return goals.filter(g => !g.completed).map(normalizeGoal);
	}

	async getGoalDetails(chatId, index) {
		const goals = await getGoals(chatId);
		if (index < 0 || index >= goals.length) throw new Error(`Invalid goal index: ${index}`);

		return normalizeGoal(goals[index]);
	}
}

module.exports = new GoalService();
