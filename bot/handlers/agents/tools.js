const { listGoals } = require('../listHandler.js');
const { swapGoals } = require('../swapGoalsHandler.js');
const { moveGoals } = require('../moveHandler.js');
const { scheduleGoal, unscheduleGoal } = require('../scheduleHandler.js');
const { listRewards, redeemReward } = require('../rewardsHandler.js');
const { addHoney } = require('../addGoalsHandler.js');
const { listPartner } = require('../listHandler.js');
const { addNote, showGoalDetails } = require('../noteHandler.js');
const goalRepo = require('../../common/goalRepository.js');
const userRepo = require('../../common/userRepository.js');
const rewardRepo = require('../../common/rewardRepository.js');
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tools = [
	{
		type: "function",
		function: {
			name: "listGoals",
			description: "Get the list of goals for the user with optional filtering",
			parameters: {
				type: "object",
				properties: {
					filter: {
						type: "string",
						description: "Filter type: 'todo' (incomplete goals only), 'all' (all goals), 'done' (completed goals), 'scheduled' (future goals), or 'today' (default - today's goals)",
						enum: ["todo", "all", "done", "scheduled", "today"]
					}
				},
				required: []
			}
		}
	},
	{
		type: "function",
		function: {
			name: "addGoal",
			description: "Add a new goal for the user",
			parameters: {
				type: "object",
				properties: {
					goalText: { type: "string", description: "The text of the goal to add" },
					isRecurring: { type: "boolean", description: "If the goal is recurring" },
					frequency: { type: "string", description: "If recurring, W (weekly) or M (monthly)" },
					interval: { type: "string", description: "If recurring, the interval (1=every, 2=every other, etc.)" },
					daySpec: { type: "string", description: "If recurring, the day spec (e.g. Mon-Fri, 1st, 2Wed)" },
					isScheduled: { type: "boolean", description: "If the goal is scheduled for a future date" },
					scheduledDate: { type: "string", description: "The date the goal is scheduled for (MM/DD/YYYY)" },
					note: { type: "string", description: "An optional note for the goal" }
				},
				required: ["goalText"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "completeGoal",
			description: "Mark a goal as completed",
			parameters: {
				type: "object",
				properties: {
					goalIndex: { type: "string", description: "The number of the goal to complete (1-based)" }
				},
				required: ["goalIndex"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "deleteGoal",
			description: "Delete a goal from the user's list",
			parameters: {
				type: "object",
				properties: {
					goalIndex: { type: "string", description: "The number of the goal to delete (1-based)" }
				},
				required: ["goalIndex"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "editGoal",
			description: "Edit a goal from the user's list",
			parameters: {
				type: "object",
				properties: {
					goalIndex: { type: "string", description: "The number of the goal to edit (1-based)" },
					goalText: { type: "string", description: "The new text for the goal" }
				},
				required: ["goalIndex", "goalText"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "swap",
			description: "Swap the positions of two goals in the user's list",
			parameters: {
				type: "object",
				properties: {
					goalIndex1: { type: "string", description: "The number of the first goal to swap (1-based)" },
					goalIndex2: { type: "string", description: "The number of the second goal to swap (1-based)" }
				},
				required: ["goalIndex1", "goalIndex2"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "move",
			description: "Move a goal to a new position in the user's list",
			parameters: {
				type: "object",
				properties: {
					goalIndex: { type: "string", description: "The number of the goal to move (1-based)" },
					newIndex: { type: "string", description: "The new position for the goal (1-based)" }
				},
				required: ["goalIndex", "newIndex"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "schedule",
			description: "Schedule a goal for a specific date",
			parameters: {
				type: "object",
				properties: {
					goalIndex: { type: "string", description: "The number of the goal to schedule (1-based)" },
					scheduledTime: { type: "string", description: "When to schedule the goal (e.g., 'tomorrow at 3pm', 'Monday morning')" }
				},
				required: ["goalIndex", "scheduledTime"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "unschedule",
			description: "Remove scheduling from a goal",
			parameters: {
				type: "object",
				properties: {
					goalIndex: { type: "string", description: "The number of the goal to unschedule (1-based)" }
				},
				required: ["goalIndex"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "recurring",
			description: "Make a goal recurring at regular intervals",
			parameters: {
				type: "object",
				properties: {
					goalIndex: { type: "string", description: "The number of the goal to make recurring (1-based)" },
					recurrencePattern: { type: "string", description: "How often the goal should recur (e.g., 'daily', 'weekly on Monday', 'monthly')" }
				},
				required: ["goalIndex", "recurrencePattern"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "unrecurring",
			description: "Remove recurrence from a goal",
			parameters: {
				type: "object",
				properties: {
					goalIndex: { type: "string", description: "The number of the goal to make non-recurring (1-based)" }
				},
				required: ["goalIndex"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "ticketvalue",
			description: "Get the current ticket value",
			parameters: { type: "object", properties: {}, required: [] }
		}
	},
	{
		type: "function",
		function: {
			name: "setticketvalue",
			description: "Set the value of tickets earned for completing goals",
			parameters: {
				type: "object",
				properties: {
					value: { type: "string", description: "The new value for tickets" }
				},
				required: ["value"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "wallet",
			description: "Check the user's ticket balance",
			parameters: { type: "object", properties: {}, required: [] }
		}
	},
	{
		type: "function",
		function: {
			name: "rewards",
			description: "List the user's available rewards",
			parameters: { type: "object", properties: {}, required: [] }
		}
	},
	{
		type: "function",
		function: {
			name: "createreward",
			description: "Create a new reward that can be redeemed with tickets",
			parameters: {
				type: "object",
				properties: {
					title: { type: "string", description: "The title of the reward" },
					description: { type: "string", description: "The description of the reward" },
					cost: { type: "string", description: "How many tickets the reward costs" }
				},
				required: ["title", "cost", "description"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "redeem",
			description: "Redeem tickets for a reward",
			parameters: {
				type: "object",
				properties: {
					rewardIndex: { type: "string", description: "The number of the reward to redeem (1-based)" }
				},
				required: ["rewardIndex"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "addHoney",
			description: "Add a goal to your partner's list",
			parameters: {
				type: "object",
				properties: {
					goalText: { type: "string", description: "The text of the goal to add" }
				},
				required: ["goalText"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "partner",
			description: "Set or view your accountability partner",
			parameters: {
				type: "object",
				properties: {
					partnerId: { type: "string", description: "The ID of your partner (optional)" }
				},
				required: []
			}
		}
	},
	{
		type: "function",
		function: {
			name: "note",
			description: "Add a note to a goal",
			parameters: {
				type: "object",
				properties: {
					goalIndex: { type: "string", description: "The number of the goal to add a note to (1-based)" },
					noteText: { type: "string", description: "The note to add to the goal" }
				},
				required: ["goalIndex", "noteText"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "details",
			description: "Get detailed information about a specific goal",
			parameters: {
				type: "object",
				properties: {
					goalIndex: { type: "string", description: "The number of the goal to get details for (1-based)" }
				},
				required: ["goalIndex"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "requestreward",
			description: "Request a new reward to be added to the system",
			parameters: {
				type: "object",
				properties: {
					rewardDescription: { type: "string", description: "Description of the reward being requested" }
				},
				required: ["rewardDescription"]
			}
		}
	}
];

const availableFunctions = {
	listGoals: async (chatId, args) => {
		listGoals(chatId, args?.filter);
		return { sendMessage: false };
	},

	addGoal: async (chatId, args) => {
		if (!args.goalText || args.goalText.trim() === '') {
			return getResponseMessage('Goal text cannot be empty.');
		}

		const goalData = { text: args.goalText };

		if (args.isScheduled && args.scheduledDate) {
			goalData.scheduled = true;
			goalData.scheduledDate = args.scheduledDate;
		}

		if (args.isRecurring && args.frequency && args.interval && args.daySpec) {
			goalData.isRecurring = true;
			goalData.recurrencePattern = `${args.frequency}:${args.interval}:${args.daySpec}`;
		}

		if (args.note) {
			goalData.notes = [{ text: args.note, createdAt: new Date().toISOString() }];
		}

		await goalRepo.addGoal(chatId, goalData);

		let responseMessage = `Goal added: ${args.goalText}`;
		if (args.isScheduled && args.scheduledDate) responseMessage += `\nScheduled for: ${args.scheduledDate}`;
		if (args.note) responseMessage += `\nNote: ${args.note}`;

		return getResponseMessage(responseMessage);
	},

	completeGoal: async (chatId, args) => {
		const index = parseInt(args.goalIndex) - 1;
		if (isNaN(index) || index < 0) {
			return getResponseMessage('Please provide a valid goal number.');
		}

		const goals = await goalRepo.getGoals(chatId);
		if (index >= goals.length) {
			return getResponseMessage(`You only have ${goals.length} goals. Please specify a valid goal number.`);
		}

		const goal = goals[index];
		if (goal.completed) {
			return getResponseMessage(`Goal "${goal.text}" is already completed.`);
		}

		const now = new Date().toISOString();
		if (goal.isRecurring) {
			await goalRepo.updateGoal(chatId, goal.goalId, { lastCompletedAt: now });
		} else {
			await goalRepo.updateGoal(chatId, goal.goalId, { status: 'completed', completed: true, completedAt: now });
		}

		await userRepo.addTicket(chatId);
		return getResponseMessage(`Completed goal: ${goal.text}\nYou earned 1 ticket!`);
	},

	deleteGoal: async (chatId, args) => {
		const index = parseInt(args.goalIndex) - 1;
		if (isNaN(index) || index < 0) {
			return getResponseMessage('Please provide a valid goal number.');
		}

		const goals = await goalRepo.getGoals(chatId);
		if (index >= goals.length) {
			return getResponseMessage(`You only have ${goals.length} goals. Please specify a valid goal number.`);
		}

		const goal = goals[index];
		await goalRepo.deleteGoal(chatId, goal.goalId);
		return getResponseMessage(`Goal deleted: ${goal.text}`);
	},

	editGoal: async (chatId, args) => {
		const index = parseInt(args.goalIndex) - 1;
		if (isNaN(index) || index < 0) {
			return getResponseMessage('Please provide a valid goal number.');
		}

		const goals = await goalRepo.getGoals(chatId);
		if (index >= goals.length) {
			return getResponseMessage(`You only have ${goals.length} goals. Please specify a valid goal number.`);
		}

		const goal = goals[index];
		await goalRepo.updateGoal(chatId, goal.goalId, { text: args.goalText, updatedAt: new Date().toISOString() });
		return getResponseMessage(`Goal updated: ${args.goalText}`);
	},

	swap: async (chatId, args) => {
		await swapGoals(args.goalIndex1, args.goalIndex2, chatId);
		return { sendMessage: false };
	},

	move: async (chatId, args) => {
		await moveGoals(args.goalIndex, args.newIndex, chatId);
		return { sendMessage: false };
	},

	schedule: async (chatId, args) => {
		await scheduleGoal(chatId, `${args.goalIndex} ${args.scheduledTime}`);
		return { sendMessage: false };
	},

	unschedule: async (chatId, args) => {
		await unscheduleGoal(chatId, args.goalIndex);
		return { sendMessage: false };
	},

	recurring: async (chatId, args) => {
		const index = parseInt(args.goalIndex) - 1;
		if (isNaN(index) || index < 0) {
			return getResponseMessage('Please provide a valid goal number.');
		}

		const goals = await goalRepo.getGoals(chatId);
		if (index >= goals.length) {
			return getResponseMessage(`You only have ${goals.length} goals. Please specify a valid goal number.`);
		}

		const goal = goals[index];
		await goalRepo.updateGoal(chatId, goal.goalId, {
			isRecurring: true,
			recurrencePattern: args.recurrencePattern
		});
		return getResponseMessage(`Set goal "${goal.text}" to recur ${args.recurrencePattern}`);
	},

	unrecurring: async (chatId, args) => {
		const index = parseInt(args.goalIndex) - 1;
		if (isNaN(index) || index < 0) {
			return getResponseMessage('Please provide a valid goal number.');
		}

		const goals = await goalRepo.getGoals(chatId);
		if (index >= goals.length) {
			return getResponseMessage(`You only have ${goals.length} goals. Please specify a valid goal number.`);
		}

		const goal = goals[index];
		if (!goal.isRecurring) {
			return getResponseMessage(`Goal "${goal.text}" is not recurring.`);
		}

		await goalRepo.updateGoal(chatId, goal.goalId, { isRecurring: null, recurrencePattern: null });
		return getResponseMessage(`Removed recurrence from goal: ${goal.text}`);
	},

	ticketvalue: async (chatId) => {
		const user = await userRepo.getUser(chatId);
		return getResponseMessage(`The current ticket value is ${user.ticketValue || 1} points.`);
	},

	setticketvalue: async (chatId, args) => {
		const ticketValue = parseInt(args.value);
		if (isNaN(ticketValue) || ticketValue < 1) {
			return getResponseMessage('Please provide a valid ticket value (must be a positive number).');
		}
		await userRepo.updateUserField(chatId, 'ticketValue', ticketValue);
		return getResponseMessage(`Ticket value set to ${ticketValue} points.`);
	},

	wallet: async (chatId) => {
		const user = await userRepo.getUser(chatId);
		return getResponseMessage(`You have ${user.TicketWallet || 0} tickets in your wallet.`);
	},

	rewards: async (chatId) => {
		await listRewards(chatId);
		return { sendMessage: false };
	},

	createreward: async (chatId, args) => {
		const user = await userRepo.getUser(chatId);
		const partnerId = user.PartnerId;
		const rewardCost = parseInt(args.cost);

		if (isNaN(rewardCost) || rewardCost < 1) {
			return getResponseMessage('Please provide a valid cost (must be a positive number).');
		}

		const newReward = {
			title: args.title,
			description: args.description,
			cost: rewardCost,
			created: new Date().toISOString()
		};

		await rewardRepo.addReward(partnerId, newReward);
		return getResponseMessage(`Created new reward: ${args.title} (${args.cost} tickets)`);
	},

	redeem: async (chatId, args) => {
		await redeemReward(chatId, args.rewardIndex);
		return { sendMessage: false };
	},

	addHoney: async (chatId, args) => {
		await addHoney(chatId, args.goalText);
		return { sendMessage: false };
	},

	partner: async (chatId, args) => {
		await listPartner(chatId);
		return { sendMessage: false };
	},

	note: async (chatId, args) => {
		await addNote(args.goalIndex, args.noteText, chatId);
		return { sendMessage: false };
	},

	details: async (chatId, args) => {
		await showGoalDetails(args.goalIndex, chatId);
		return { sendMessage: false };
	},

	requestreward: async (chatId, args) => {
		return getResponseMessage(`Your reward request "${args.rewardDescription}" has been submitted for review. We'll notify you when it's available!`);
	}
};

async function tryMatchGoalByDescription(chatId, goalDescription) {
	const goals = await goalRepo.getGoals(chatId);
	if (!goals || goals.length === 0) return '-1';

	const directIndex = parseInt(goalDescription);
	if (!isNaN(directIndex) && directIndex > 0 && directIndex <= goals.length) {
		return directIndex.toString();
	}

	const goalsList = goals.map((goal, i) => `${i + 1}. ${goal.text}`).join('\n');

	const messages = [
		{
			role: 'system',
			content: `You are a goal matching system. Given a list of goals and a description, return only the index number of the matching goal. If no match, return -1. Always return ONLY a number.`
		},
		{
			role: 'user',
			content: `Here are the goals:\n${goalsList}\n\nWhich goal matches this description: "${goalDescription}"?`
		}
	];

	try {
		const response = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages,
			max_tokens: 10
		});
		const content = response.choices[0].message.content.trim();
		const matchedIndex = parseInt(content);
		if (!isNaN(matchedIndex) && matchedIndex > 0 && matchedIndex <= goals.length) {
			return matchedIndex.toString();
		}
		return '-1';
	} catch (error) {
		console.error('Error matching goal by description:', error);
		return '-1';
	}
}

const getResponseMessage = (message) => ({ sendMessage: true, message });

module.exports = { tools, availableFunctions };
