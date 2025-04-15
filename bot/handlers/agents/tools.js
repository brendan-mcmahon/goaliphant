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
					goalText: {
						type: "string",
						description: "The text of the goal to add"
					},
					isRecurring: {
						type: "boolean",
						description: "If the goal is recurring"
					},
					frequency: {
						type: "string",
						description: "If the goal is recurring, indicates whether the recurrence is weekly (W) or monthly (M)"
					},
					interval: {
						type: "string",
						description: "If the goal is recurring, the interval for the recurrence pattern. 1 for every period, 2 for every other period, 3 for every third, etc."
					},
					daySpec: {
						type: "string",
					},
					isScheduled: {
						type: "boolean",
						description: "If the goal is scheduled, this will be true"
					},
					scheduledDate: {
						type: "string",
					},
					note: {
						type: "string",
						description: "If the goal has a note, this will be the note"
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
					title: {
						type: "string",
						description: "The title of the reward"
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
	listGoals: async (chatId, args) => {
		listGoals(chatId, args?.filter);
		return {
			sendMessage: false,
		};
	},

	addGoal: async (chatId, args) => {
		console.log("addGoal", chatId, args);
		if (!args.goalText || args.goalText.trim() === '') {
			return getResponseMessage("Goal text cannot be empty.");
		}

		let goals = await goalRepo.getGoals(chatId);

		const newGoal = {
			id: uuidv4(),
			text: args.goalText,
			completed: false,
			created: new Date().toISOString()
		};

		if (args.isScheduled) {
			newGoal.scheduled = true;
			if (args.scheduledDate) {
				newGoal.scheduledDate = args.scheduledDate;
			}
		}

		if (args.note) {
			newGoal.note = args.note;
		}

		
		if (args.isRecurring && args.frequency && args.interval && args.daySpec) {
			newGoal.recurring = true;
			newGoal.recurrencePattern = `${args.frequency}:${args.interval}:${args.daySpec}`;
		}

		goals.push(newGoal);

		await goalRepo.updateGoals(chatId, goals);

		let responseMessage = `Goal added: ${args.goalText}`;
		
		if (args.isScheduled && args.scheduledDate) {
			responseMessage += `\nScheduled for: ${args.scheduledDate}`;
		}
		
		if (args.note) {
			responseMessage += `\nNote: ${args.note}`;
		}


		return getResponseMessage(responseMessage);
	},

	completeGoal: async (chatId, args) => {
		const goalIndex = await tryMatchGoalByDescription(chatId, args.goalDescription);

		console.log("completeGoal", chatId, args.goalDescription);
		const index = parseInt(goalIndex);
		if (isNaN(index) || index < 1) {
			return getResponseMessage("Please provide a valid goal number.");
		}

		let goals = await goalRepo.getGoals(chatId);

		if (index > goals.length) {
			return getResponseMessage(`You only have ${goals.length} goals. Please specify a valid goal number.`);
		}

		const goal = goals[index - 1];

		if (goal.completed) {
			return getResponseMessage(`Goal "${goal.text}" is already completed.`);
		}

		goal.completed = true;

		await goalRepo.updateGoals(chatId, goals);

		await userRepo.addTicket(chatId);

		return getResponseMessage(`Completed goal: ${goal.text}\nYou earned 1 ticket!`);
	},

	deleteGoal: async (chatId, args) => {
		console.log("deleteGoal", chatId, args.goalIndex);
		const index = parseInt(args.goalIndex);
		if (isNaN(index) || index < 1) {
			return getResponseMessage("Please provide a valid goal number.");
		}

		let goals = await goalRepo.getGoals(chatId);

		if (index > goals.length) {
			return getResponseMessage(`You only have ${goals.length} goals. Please specify a valid goal number.`);
		}

		goals.splice(index - 1, 1);

		await goalRepo.updateGoals(chatId, goals);

		console.log("Goal deleted: ", goals[index - 1]);

		return getResponseMessage(`Goal deleted:`); // ${goals[index - 1].text}`;
	},

	editGoal: async (chatId, args) => {
		console.log("editGoal", chatId, args.goalIndex, args.goalText);
		const index = parseInt(args.goalIndex);
		if (isNaN(index) || index < 1) {
			return getResponseMessage("Please provide a valid goal number.");
		}

		let goals = await goalRepo.getGoals(chatId);

		if (index > goals.length) {
			return getResponseMessage(`You only have ${goals.length} goals. Please specify a valid goal number.`);
		}

		goals[index - 1].text = args.goalText;

		await goalRepo.updateGoals(chatId, goals);

		return getResponseMessage(`Goal updated: ${args.goalText}`);
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
			return getResponseMessage("Please provide a valid goal number.");
		}
		
		let goals = await goalRepo.getGoals(chatId);
		
		if (index > goals.length) {
			return getResponseMessage(`You only have ${goals.length} goals. Please specify a valid goal number.`);
		}
		
		goals[index - 1].recurring = true;
		goals[index - 1].recurrencePattern = args.recurrencePattern;
		
		await goalRepo.updateGoals(chatId, goals);
		
		return getResponseMessage(`Set goal "${goals[index - 1].text}" to recur ${args.recurrencePattern}`);
	},
	
	unrecurring: async (chatId, args) => {
		console.log("unrecurring", chatId, args.goalIndex);
		const index = parseInt(args.goalIndex);
		
		if (isNaN(index) || index < 1) {
			return getResponseMessage("Please provide a valid goal number.");
		}
		
		let goals = await goalRepo.getGoals(chatId);
		
		if (index > goals.length) {
			return getResponseMessage(`You only have ${goals.length} goals. Please specify a valid goal number.`);
		}
		
		if (!goals[index - 1].recurring) {
			return getResponseMessage(`Goal "${goals[index - 1].text}" is not recurring.`);
		}
		
		goals[index - 1].recurring = false;
		delete goals[index - 1].recurrencePattern;
		
		await goalRepo.updateGoals(chatId, goals);
		
		return getResponseMessage(`Removed recurrence from goal: ${goals[index - 1].text}`);
	},
	
	ticketvalue: async (chatId) => {
			console.log("ticketvalue", chatId);
		const user = await userRepo.getUser(chatId);
		return getResponseMessage(`The current ticket value is ${user.ticketValue || 1} points.`);
	},
	
	setticketvalue: async (chatId, args) => {
		console.log("setticketvalue", chatId, args.value);
		const ticketValue = parseInt(args.value);
		
		if (isNaN(ticketValue) || ticketValue < 1) {
			return getResponseMessage("Please provide a valid ticket value (must be a positive number).");
		}
		
		await userRepo.setTicketValue(chatId, ticketValue);
		
		return getResponseMessage(`Ticket value set to ${ticketValue} points.`);
	},
	
	wallet: async (chatId) => {
		console.log("wallet", chatId);
		const user = await userRepo.getUser(chatId);
		return getResponseMessage(`You have ${user.TicketWallet || 0} tickets in your wallet.`);
	},
	
	rewards: async (chatId) => {
		await listRewards(chatId);
		return {
			sendMessage: false,
		};
	},
	
	createreward: async (chatId, args) => {
		console.log("createreward", chatId, args.name, args.cost);
		const user = await userRepo.getUser(chatId);
		const partnerId = user.PartnerId;

		const rewardCost = parseInt(args.cost);
		
		if (isNaN(rewardCost) || rewardCost < 1) {
			return getResponseMessage("Please provide a valid cost (must be a positive number).");
		}
		
		const newReward = {
			id: uuidv4(),
			title: args.title,
			description: args.description,
			cost: rewardCost,
			created: new Date().toISOString()
		};
		
		await rewardRepo.addReward(partnerId, newReward);

		sendMessage(partnerId, `Your partner ${user.name} has created a new reward: ${args.title} (${args.cost} tickets)`);
		
		return getResponseMessage(`Created new reward: ${args.name} (${args.cost} tickets)`);
	},
	
	redeem: async (chatId, args) => {
		await redeemReward(chatId, args.rewardIndex);
		return {
			sendMessage: false,
		};
	},
	
	addHoney: async (chatId, args) => {
		console.log("addHoney", chatId, args);
		await addHoney(chatId, args.goalText);
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
			
	requestreward: async (chatId, args) => {
		console.log("requestreward", chatId, args.rewardDescription);
		
		// TODO: Implement 
		
		return getResponseMessage(`Your reward request "${args.rewardDescription}" has been submitted for review. We'll notify you when it's available!`);
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

const getResponseMessage = (message) => {
	return {
		sendMessage: true,
		message: message
	};
};	

module.exports = { tools, availableFunctions };
