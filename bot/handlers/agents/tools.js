const { listGoals } = require('../listHandler.js');
const { swapGoals } = require('../swapGoalsHandler.js');
const { scheduleGoal, unscheduleGoal } = require('../scheduleHandler.js');
const { listRewards, redeemReward } = require('../rewardsHandler.js');
const { addHoney } = require('../addGoalsHandler.js');
const { listPartner } = require('../listHandler.js');
const { addNote, showGoalDetails } = require('../noteHandler.js');
const goalRepo = require('../../common/goalRepository.js');
const userRepo = require('../../common/userRepository.js');
const rewardRepo = require('../../common/rewardRepository.js');

const { v4: uuidv4 } = require('uuid');

const tools = [
	{
		type: "function",
		function: {
			name: "listGoals",
			description: "Get the list of today's goals for the user",
			parameters: {
				type: "object",
				// TODO: add options for "todo," "all," "scheduled", etc...
				properties: {},
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
				// TODO: add options for "schedule," "recurring," "note," etc...
				properties: {
					goalText: {
						type: "string",
						description: "The text of the goal to add"
					}
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
					goalIndex: {
						type: "string",
						description: "The number of the goal to complete (1-based)"
					}
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
					goalIndex: {
						type: "string",
						description: "The number of the goal to delete (1-based)"
					}
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
					goalIndex: {
						type: "string",
						description: "The number of the goal to edit (1-based)"
					},
					goalText: {
						type: "string",
						description: "The new text for the goal"
					}
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
					goalIndex1: {
						type: "string",
						description: "The number of the first goal to swap (1-based)"
					},
					goalIndex2: {
						type: "string",
						description: "The number of the second goal to swap (1-based)"
					}
				},
				required: ["goalIndex1", "goalIndex2"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "schedule",
			description: "Schedule a goal for a specific time",
			parameters: {
				type: "object",
				properties: {
					goalIndex: {
						type: "string",
						description: "The number of the goal to schedule (1-based)"
					},
					// TODO: This is not right. We need a specific format for the scheduled time that we can parse. Right now we're using {day/month}
					scheduledTime: {
						type: "string",
						description: "When to schedule the goal (e.g., 'tomorrow at 3pm', 'Monday morning')" 
					}
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
					goalIndex: {
						type: "string",
						description: "The number of the goal to unschedule (1-based)"
					}
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
					goalIndex: {
						type: "string",
						description: "The number of the goal to make recurring (1-based)"
					},
					// This is still a work in progress. We need a format that's similar to CRON but without dates. It should also be able to handle "every 2 weeks" or "every 2 months" etc...
					recurrencePattern: {
						type: "string",
						description: "How often the goal should recur (e.g., 'daily', 'weekly on Monday', 'monthly')"
					}
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
					goalIndex: {
						type: "string",
						description: "The number of the goal to make non-recurring (1-based)"
					}
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
			parameters: {
				type: "object",
				properties: {},
				required: []
			}
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
					value: {
						type: "string",
						description: "The new value for tickets"
					}
				},
				required: ["value"]
			}
		}
	},
	{
		// TODO: This is broken.
		type: "function",
		function: {
			name: "wallet",
			description: "Check the user's ticket balance",
			parameters: {
				type: "object",
				properties: {},
				required: []
			}
		}
	},
	{
		type: "function",
		function: {
			name: "rewards",
			description: "List the user's available rewards",
			parameters: {
				type: "object",
				properties: {},
				required: []
			}
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
					name: {
						type: "string",
						description: "The name of the reward"
					},
					description: {
						type: "string",
						description: "The description of the reward"
					},
					cost: {
						type: "string",
						description: "How many tickets the reward costs"
					}
				},
				required: ["name", "cost", "description"]
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
					rewardIndex: {
						type: "string",
						description: "The number of the reward to redeem (1-based)"
					}
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
					goalText: {
						type: "string",
						description: "The text of the goal to add"
					}
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
					partnerId: {
						type: "string",
						description: "The ID of your partner (optional - if not provided, shows current partner)"
					}
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
					goalIndex: {
						type: "string",
						description: "The number of the goal to add a note to (1-based)"
					},
					noteText: {
						type: "string",
						description: "The note to add to the goal"
					}
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
					goalIndex: {
						type: "string",
						description: "The number of the goal to get details for (1-based)"
					}
				},
				required: ["goalIndex"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: "dashboard",
			description: "Get an overview of the user's goals and rewards",
			parameters: {
				type: "object",
				properties: {},
				required: []
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
					rewardDescription: {
						type: "string",
						description: "Description of the reward being requested"
					}
				},
				required: ["rewardDescription"]
			}
		}
	}
];

const availableFunctions = {
	listGoals: async (chatId) => {
		listGoals(chatId);
		return {
			sendMessage: false,
		};
	},

	addGoal: async (chatId, args) => {
		console.log("addGoal", chatId, args.goalText);
		if (!args.goalText || args.goalText.trim() === '') {
			return "Goal text cannot be empty.";
		}

		let goals = await goalRepo.getGoals(chatId);

		const newGoal = {
			id: uuidv4(),
			text: args.goalText,
			completed: false,
			created: new Date().toISOString()
		};

		goals.push(newGoal);

		await goalRepo.updateGoals(chatId, goals);

		return `Goal added: ${args.goalText}`;
	},

	completeGoal: async (chatId, args) => {
		const goalIndex = await tryMatchGoalByDescription(chatId, args.goalDescription);

		console.log("completeGoal", chatId, args.goalDescription);
		const index = parseInt(goalIndex);
		if (isNaN(index) || index < 1) {
			return "Please provide a valid goal number.";
		}

		let goals = await goalRepo.getGoals(chatId);

		if (index > goals.length) {
			return `You only have ${goals.length} goals. Please specify a valid goal number.`;
		}

		const goal = goals[index - 1];

		if (goal.completed) {
			return `Goal "${goal.text}" is already completed.`;
		}

		goal.completed = true;

		await goalRepo.updateGoals(chatId, goals);

		await userRepo.addTicket(chatId);

		return `Completed goal: ${goal.text}\nYou earned 1 ticket!`;
	},

	deleteGoal: async (chatId, args) => {
		console.log("deleteGoal", chatId, args.goalIndex);
		const index = parseInt(args.goalIndex);
		if (isNaN(index) || index < 1) {
			return "Please provide a valid goal number.";
		}

		let goals = await goalRepo.getGoals(chatId);

		if (index > goals.length) {
			return `You only have ${goals.length} goals. Please specify a valid goal number.`;
		}

		goals.splice(index - 1, 1);

		await goalRepo.updateGoals(chatId, goals);

		console.log("Goal deleted: ", goals[index - 1]);

		return `Goal deleted:`; // ${goals[index - 1].text}`;
	},

	editGoal: async (chatId, args) => {
		console.log("editGoal", chatId, args.goalIndex, args.goalText);
		const index = parseInt(args.goalIndex);
		if (isNaN(index) || index < 1) {
			return "Please provide a valid goal number.";
		}

		let goals = await goalRepo.getGoals(chatId);

		if (index > goals.length) {
			return `You only have ${goals.length} goals. Please specify a valid goal number.`;
		}

		goals[index - 1].text = args.goalText;

		await goalRepo.updateGoals(chatId, goals);

		return `Goal updated: ${args.goalText}`;
	},
	
	swap: async (chatId, args) => {
		await swapGoals(chatId, args.goalIndex1, args.goalIndex2);
		return {
			sendMessage: false,
		};
	},
	
	schedule: async (chatId, args) => {
		await scheduleGoal(chatId, args.goalIndex, args.scheduledTime);
		return {
			sendMessage: false,
		};
	},
	
	unschedule: async (chatId, args) => {
		await unscheduleGoal(chatId, args.goalIndex);
		return {
			sendMessage: false,
		};
	},
	
	recurring: async (chatId, args) => {
		console.log("recurring", chatId, args.goalIndex, args.recurrencePattern);
		const index = parseInt(args.goalIndex);
		
		if (isNaN(index) || index < 1) {
				return "Please provide a valid goal number.";
		}
		
		let goals = await goalRepo.getGoals(chatId);
		
		if (index > goals.length) {
			return `You only have ${goals.length} goals. Please specify a valid goal number.`;
		}
		
		goals[index - 1].recurring = true;
		goals[index - 1].recurrencePattern = args.recurrencePattern;
		
		await goalRepo.updateGoals(chatId, goals);
		
		return `Set goal "${goals[index - 1].text}" to recur ${args.recurrencePattern}`;
	},
	
	unrecurring: async (chatId, args) => {
		console.log("unrecurring", chatId, args.goalIndex);
		const index = parseInt(args.goalIndex);
		
		if (isNaN(index) || index < 1) {
			return "Please provide a valid goal number.";
		}
		
		let goals = await goalRepo.getGoals(chatId);
		
		if (index > goals.length) {
			return `You only have ${goals.length} goals. Please specify a valid goal number.`;
		}
		
		if (!goals[index - 1].recurring) {
			return `Goal "${goals[index - 1].text}" is not recurring.`;
		}
		
		goals[index - 1].recurring = false;
		delete goals[index - 1].recurrencePattern;
		
		await goalRepo.updateGoals(chatId, goals);
		
		return `Removed recurrence from goal: ${goals[index - 1].text}`;
	},
	
	ticketvalue: async (chatId) => {
			console.log("ticketvalue", chatId);
		const user = await userRepo.getUser(chatId);
		return `The current ticket value is ${user.ticketValue || 1} points.`;
	},
	
	setticketvalue: async (chatId, args) => {
		console.log("setticketvalue", chatId, args.value);
		const ticketValue = parseInt(args.value);
		
		if (isNaN(ticketValue) || ticketValue < 1) {
			return "Please provide a valid ticket value (must be a positive number).";
		}
		
		await userRepo.setTicketValue(chatId, ticketValue);
		
		return `Ticket value set to ${ticketValue} points.`;
	},
	
	wallet: async (chatId) => {
		console.log("wallet", chatId);
		const user = await userRepo.getUser(chatId);
		return `You have ${user.TicketWallet || 0} tickets in your wallet.`;
	},
	
	rewards: async (chatId) => {
		await listRewards(chatId);
		return {
			sendMessage: false,
		};
	},
	
	createreward: async (chatId, args) => {
		console.log("createreward", chatId, args.name, args.cost);
		const rewardCost = parseInt(args.cost);
		
		if (isNaN(rewardCost) || rewardCost < 1) {
			return "Please provide a valid cost (must be a positive number).";
		}
		
		const newReward = {
			id: uuidv4(),
			name: args.name,
			cost: rewardCost,
			created: new Date().toISOString()
		};
		
		await rewardRepo.addReward(chatId, newReward);
		
		return `Created new reward: ${args.name} (${args.cost} tickets)`;
	},
	
	redeem: async (chatId, args) => {
		await redeemReward(chatId, args.rewardIndex);
		return {
			sendMessage: false,
		};
	},
	
	addHoney: async (chatId, args) => {
		await addHoney(chatId, args.message);
		return {
			sendMessage: false,
		};
	},
	
	partner: async (chatId, args) => {
		await listPartner(chatId, args.partnerId);
		return {
			sendMessage: false,
		};
	},
	
	note: async (chatId, args) => {
		await addNote(chatId, args.goalIndex, args.noteText);
		return {
			sendMessage: false,
		};
	},
	
	details: async (chatId, args) => {
		await showGoalDetails(chatId, args.goalIndex);
		return {
			sendMessage: false,
		};
	},
	
	dashboard: async (chatId) => {
		console.log("dashboard", chatId);
		const goals = await goalRepo.getGoals(chatId);
		const user = await userRepo.getUser(chatId);
		
		let dashboard = "📊 Your Dashboard 📊\n\n";
		
		// Goals summary
		const completedGoals = goals.filter(g => g.completed).length;
		dashboard += `Goals: ${completedGoals}/${goals.length} completed\n`;
		
		// Tickets
		dashboard += `Tickets: ${user.tickets || 0}\n`;
		
		// Recent goals
		if (goals.length > 0) {
			dashboard += "\nRecent Goals:\n";
			goals.slice(0, 3).forEach((goal, index) => {
				dashboard += `${index + 1}. ${goal.completed ? '✅' : '⬜'} ${goal.text}\n`;
			});
		}
		
		// Rewards
		if (user.rewards && user.rewards.length > 0) {
			dashboard += "\nAvailable Rewards:\n";
			user.rewards.slice(0, 3).forEach((reward, index) => {
				dashboard += `${index + 1}. ${reward.name} (${reward.cost} tickets)\n`;
			});
		}
		
		return dashboard;
	},
		
	requestreward: async (chatId, args) => {
		console.log("requestreward", chatId, args.rewardDescription);
		
		// TODO: Implement 
		
		return `Your reward request "${args.rewardDescription}" has been submitted for review. We'll notify you when it's available!`;
	}
};

async function tryMatchGoalByDescription(chatId, goalDescription) {
	console.log("tryMatchGoalByDescription", chatId, goalDescription);

	const goals = await goalRepo.getGoals(chatId);
	if (!goals || goals.length === 0) {
		return "-1"; // No goals found
	}

	const directIndex = parseInt(goalDescription);
	if (!isNaN(directIndex) && directIndex > 0 && directIndex <= goals.length) {
		return directIndex.toString();
	}

	const goalsList = goals.map((goal, index) =>
		`${index + 1}. ${goal.text}`
	).join('\n');

	const messages = [
		{
			role: "system",
			content: `You are a goal matching system. You will be given a list of goals and a description, and your task is to determine which goal the description refers to. Return only the index number of the matching goal.

If there's an exact match, return that goal's number.
If there's a partial match and only one goal matches, return that goal's number.
If multiple goals could match, return the best match.
If no goals match, return -1.
Always return ONLY a number, nothing else.`
		},
		{
			role: "user",
			content: `Here are the goals:\n${goalsList}\n\nWhich goal matches this description: "${goalDescription}"?`
		}
	];

	try {
		const response = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: messages,
			max_tokens: 10 // We only need a small number to return
		});

		const content = response.choices[0].message.content.trim();
		console.log("AI matched goal index:", content);

		const matchedIndex = parseInt(content);
		if (!isNaN(matchedIndex) && matchedIndex > 0 && matchedIndex <= goals.length) {
			return matchedIndex.toString();
		} else if (matchedIndex === -1) {
			return "-1"; // No match found
		} else {
			return "-1"; // Invalid response
		}
	} catch (error) {
		console.error("Error matching goal by description:", error);
		return "-1"; // Error case
	}
}

module.exports = { tools, availableFunctions };
