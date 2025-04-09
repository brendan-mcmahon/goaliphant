const { OpenAI } = require('openai');
const { sendMessage } = require('../bot.js');

const goalRepo = require('../common/goalRepository.js');
const userRepo = require('../common/userRepository.js');
const { v4: uuidv4 } = require('uuid');

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
});

const availableFunctions = {
	// TODO: Let's just call listHandler and don't send the response from the bot.
	listGoals: async (chatId) => {
		console.log("listGoals", chatId);
		const goals = await goalRepo.getGoals(chatId);
		return goals.map((goal, index) =>
			`${index + 1}. ${goal.completed ? '✅' : '⬜'} ${goal.text}`
		).join('\n');
	},

	addGoal: async (chatId, goalText) => {
		console.log("addGoal", chatId, goalText);
		if (!goalText || goalText.trim() === '') {
			return "Goal text cannot be empty.";
		}

		let goals = await goalRepo.getGoals(chatId);

		const newGoal = {
			id: uuidv4(),
			text: goalText,
			completed: false,
			created: new Date().toISOString()
		};

		goals.push(newGoal);

		await goalRepo.updateGoals(chatId, goals);

		return `Goal added: ${goalText}`;
	},

	completeGoal: async (chatId, goalDescription) => {
		const goalIndex = await tryMatchGoalByDescription(chatId, goalDescription);

		console.log("completeGoal", chatId, goalIndex);
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

	deleteGoal: async (chatId, goalIndex) => {
		console.log("deleteGoal", chatId, goalIndex);
		const index = parseInt(goalIndex);
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

	editGoal: async (chatId, goalIndex, goalText) => {
		console.log("editGoal", chatId, goalIndex, goalText);
		const index = parseInt(goalIndex);
		if (isNaN(index) || index < 1) {
			return "Please provide a valid goal number.";
		}

		let goals = await goalRepo.getGoals(chatId);

		if (index > goals.length) {
			return `You only have ${goals.length} goals. Please specify a valid goal number.`;
		}

		goals[index - 1].text = goalText;

		await goalRepo.updateGoals(chatId, goals);

		return `Goal updated: ${goalText}`;
	},
	
	// Update to use the handler. Do not respond.
	swap: async (chatId, goalIndex1, goalIndex2) => {
		console.log("swap", chatId, goalIndex1, goalIndex2);
		const index1 = parseInt(goalIndex1);
		const index2 = parseInt(goalIndex2);
		
		if (isNaN(index1) || isNaN(index2) || index1 < 1 || index2 < 1) {
			return "Please provide valid goal numbers.";
		}
		
		let goals = await goalRepo.getGoals(chatId);
		
		if (index1 > goals.length || index2 > goals.length) {
			return `You only have ${goals.length} goals. Please specify valid goal numbers.`;
		}
		
		[goals[index1 - 1], goals[index2 - 1]] = [goals[index2 - 1], goals[index1 - 1]];
		
		await goalRepo.updateGoals(chatId, goals);
		
		return `Swapped goals:\n1. ${goals[index1 - 1].text}\n2. ${goals[index2 - 1].text}`;
	},
	
	schedule: async (chatId, goalIndex, scheduledTime) => {
		console.log("schedule", chatId, goalIndex, scheduledTime);
		const index = parseInt(goalIndex);
		
		if (isNaN(index) || index < 1) {
			return "Please provide a valid goal number.";
		}
		
		let goals = await goalRepo.getGoals(chatId);
		
		if (index > goals.length) {
			return `You only have ${goals.length} goals. Please specify a valid goal number.`;
		}
		
		goals[index - 1].scheduledTime = scheduledTime;
		
		await goalRepo.updateGoals(chatId, goals);
		
		return `Scheduled goal "${goals[index - 1].text}" for ${scheduledTime}`;
	},
	
	unschedule: async (chatId, goalIndex) => {
		console.log("unschedule", chatId, goalIndex);
		const index = parseInt(goalIndex);
		
		if (isNaN(index) || index < 1) {
			return "Please provide a valid goal number.";
		}
		
		let goals = await goalRepo.getGoals(chatId);
		
		if (index > goals.length) {
			return `You only have ${goals.length} goals. Please specify a valid goal number.`;
		}
		
		if (!goals[index - 1].scheduledTime) {
			return `Goal "${goals[index - 1].text}" is not scheduled.`;
		}
		
		delete goals[index - 1].scheduledTime;
		
		await goalRepo.updateGoals(chatId, goals);
		
		return `Removed schedule from goal: ${goals[index - 1].text}`;
	},
	
	recurring: async (chatId, goalIndex, recurrencePattern) => {
		console.log("recurring", chatId, goalIndex, recurrencePattern);
		const index = parseInt(goalIndex);
		
		if (isNaN(index) || index < 1) {
			return "Please provide a valid goal number.";
		}
		
		let goals = await goalRepo.getGoals(chatId);
		
		if (index > goals.length) {
			return `You only have ${goals.length} goals. Please specify a valid goal number.`;
		}
		
		goals[index - 1].recurring = true;
		goals[index - 1].recurrencePattern = recurrencePattern;
		
		await goalRepo.updateGoals(chatId, goals);
		
		return `Set goal "${goals[index - 1].text}" to recur ${recurrencePattern}`;
	},
	
	unrecurring: async (chatId, goalIndex) => {
		console.log("unrecurring", chatId, goalIndex);
		const index = parseInt(goalIndex);
		
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
	
	setticketvalue: async (chatId, value) => {
		console.log("setticketvalue", chatId, value);
		const ticketValue = parseInt(value);
		
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
		console.log("rewards", chatId);
		// This is not how this works. There is a separate rewards table.
		// But in the end, we don't necessarily want to get it from there, we really just need to trigger the same thing 
		const user = await userRepo.getUser(chatId);
		
		if (!user.rewards || user.rewards.length === 0) {
			return "You don't have any rewards yet. Create one with the createreward command!";
		}

		// Call rewardsHandler.listRewards instead of sending a message to the user.
		
		return user.rewards.map((reward, index) =>
			`${index + 1}. ${reward.name} (${reward.cost} tickets)`
		).join('\n');
	},
	
	createreward: async (chatId, name, cost) => {
		console.log("createreward", chatId, name, cost);
		const rewardCost = parseInt(cost);
		
		if (isNaN(rewardCost) || rewardCost < 1) {
			return "Please provide a valid cost (must be a positive number).";
		}
		
		const newReward = {
			id: uuidv4(),
			name,
			cost: rewardCost,
			created: new Date().toISOString()
		};
		
		await userRepo.addReward(chatId, newReward);
		
		return `Created new reward: ${name} (${rewardCost} tickets)`;
	},
	
	redeem: async (chatId, rewardIndex) => {
		console.log("redeem", chatId, rewardIndex);
		const index = parseInt(rewardIndex);
		
		if (isNaN(index) || index < 1) {
			return "Please provide a valid reward number.";
		}
		
		const user = await userRepo.getUser(chatId);
		
		if (!user.rewards || index > user.rewards.length) {
			return `You only have ${user.rewards ? user.rewards.length : 0} rewards. Please specify a valid reward number.`;
		}
		
		const reward = user.rewards[index - 1];
		
		if ((user.tickets || 0) < reward.cost) {
			return `You don't have enough tickets to redeem "${reward.name}". You have ${user.tickets || 0} tickets, but need ${reward.cost}.`;
		}
		
		await userRepo.useTickets(chatId, reward.cost);
		
		return `Redeemed reward: ${reward.name}! You have ${(user.tickets || 0) - reward.cost} tickets remaining.`;
	},
	
	honey: async (chatId, message) => {
		console.log("honey", chatId, message);
		const user = await userRepo.getUser(chatId);
		
		if (!user.partner) {
			return "You don't have a partner set up yet. Use the partner command to set one up!";
		}
		
		await sendMessage(user.partner, `💌 Message from your partner: ${message}`);
		
		return "Message sent to your partner! 💕";
	},
	
	partner: async (chatId, partnerId) => {
		console.log("partner", chatId, partnerId);
		
		if (!partnerId || partnerId.trim() === '') {
			const user = await userRepo.getUser(chatId);
			return user.partner ? 
				`Your partner ID is: ${user.partner}` : 
				"You don't have a partner set up yet. Use 'partner [ID]' to set one up!";
		}
		
		await userRepo.setPartner(chatId, partnerId);
		
		return `Partner set to ID: ${partnerId}. They will need to set you as their partner too!`;
	},
	
	note: async (chatId, goalIndex, noteText) => {
		console.log("note", chatId, goalIndex, noteText);
		const index = parseInt(goalIndex);
		
		if (isNaN(index) || index < 1) {
			return "Please provide a valid goal number.";
		}
		
		let goals = await goalRepo.getGoals(chatId);
		
		if (index > goals.length) {
			return `You only have ${goals.length} goals. Please specify a valid goal number.`;
		}
		
		goals[index - 1].note = noteText;
		
		await goalRepo.updateGoals(chatId, goals);
		
		return `Added note to goal "${goals[index - 1].text}": ${noteText}`;
	},
	
	details: async (chatId, goalIndex) => {
		console.log("details", chatId, goalIndex);
		const index = parseInt(goalIndex);
		
		if (isNaN(index) || index < 1) {
			return "Please provide a valid goal number.";
		}
		
		let goals = await goalRepo.getGoals(chatId);
		
		if (index > goals.length) {
			return `You only have ${goals.length} goals. Please specify a valid goal number.`;
		}
		
		const goal = goals[index - 1];
		let details = `Goal ${index}: ${goal.text}\n`;
		details += `Status: ${goal.completed ? 'Completed ✅' : 'Not completed ⬜'}\n`;
		details += `Created: ${new Date(goal.created).toLocaleString()}\n`;
		
		if (goal.scheduledTime) {
			details += `Scheduled for: ${goal.scheduledTime}\n`;
		}
		
		if (goal.recurring) {
			details += `Recurring: ${goal.recurrencePattern}\n`;
		}
		
		if (goal.note) {
			details += `Note: ${goal.note}\n`;
		}
		
		return details;
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
	
	help: async () => {
		console.log("help");
		return `
Goaliphant Commands:
- List goals: "Show my goals" or "list goals"
- Add goal: "Add goal: [goal text]"
- Complete goal: "Complete goal 1" or "mark [goal text] as done"
- Delete goal: "Delete goal 1"
- Edit goal: "Edit goal 1 to [new text]"
- Swap goals: "Swap goals 1 and 2"
- Schedule goal: "Schedule goal 1 for tomorrow at 3pm"
- Unschedule goal: "Unschedule goal 1"
- Make recurring: "Make goal 1 recurring daily"
- Remove recurrence: "Remove recurrence from goal 1"
- Add note: "Add note to goal 1: [note text]"
- See details: "Show details for goal 1"
- Ticket value: "What's my ticket value?"
- Set ticket value: "Set ticket value to 5"
- Wallet: "Show my wallet" or "how many tickets do I have?"
- Rewards: "Show my rewards"
- Create reward: "Create reward: [name] costing [cost] tickets"
- Redeem: "Redeem reward 1"
- Partner: "Set partner [ID]" or "message partner: [text]"
- Dashboard: "Show dashboard"
- Help: "Help" or "What can you do?"
- Release notes: "Show release notes"
`;
	},
	
	"release-notes": async () => {
		console.log("release-notes");
		return `
📝 Goaliphant Release Notes - v1.0

- Initial release of Goaliphant, your friendly goal-tracking assistant
- Goal management: add, edit, complete, and delete goals
- Schedule goals for specific times
- Set recurring goals with various patterns
- Ticket system for rewarding completed goals
- Create and redeem custom rewards
- Partner messaging for accountability
- Detailed goal tracking with notes
- Dashboard for overview of progress

Thanks for using Goaliphant! 🐘
`;
	},
	
	requestreward: async (chatId, rewardDescription) => {
		console.log("requestreward", chatId, rewardDescription);
		
		// This would typically send a notification to an admin or create a pending request
		// For now, we'll just acknowledge the request
		
		return `Your reward request "${rewardDescription}" has been submitted for review. We'll notify you when it's available!`;
	}
};

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
			name: "honey",
			description: "Send a message to your accountability partner",
			parameters: {
				type: "object",
				properties: {
					message: {
						type: "string",
						description: "The message to send to your partner"
					}
				},
				required: ["message"]
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
			name: "help",
			description: "Show help information about available commands",
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
			name: "release-notes",
			description: "Show release notes for the latest version",
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

const SYSTEM_PROMPT = `You are Goaliphant, a helpful assistant integrated with a goal tracking Telegram bot. 
You can help users manage their goals by:
- Listing their current goals
- Adding new goals to their list
- Marking goals as completed

Be friendly, supportive, and encouraging. Keep responses concise and conversational.

When users ask you to perform actions like adding or completing goals, use the appropriate function rather than just explaining how to do it.
Respond naturally as if you're having a conversation, but handle the user's requests efficiently.

Don't ask for confirmation if you believe the user's request is clear and unambiguous.

If you make changes to the user's goals, send an updated list of goals to the user.

If the user sends a message that isn't an explicit request, let them know and ask them to try again.

Don't ask follow up questions.

You are seeing the last 10 messages in the chat history.
`;

async function handleAIMessage(chatId, userMessage) {
	try {

		const chatHistory = (await userRepo.getUser(chatId)).chatHistory;

		const messages = [
			{
				role: "system",
				content: SYSTEM_PROMPT
			},
			...chatHistory,
			{
				role: "user",
				content: userMessage
			}
		];

		const response = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: messages,
			tools: tools,
			tool_choice: "auto"
		});

		const responseMessage = response.choices[0].message;

		if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
			const secondMessages = [...messages, responseMessage];

			for (const toolCall of responseMessage.tool_calls) {
				const functionName = toolCall.function.name;
				const functionToCall = availableFunctions[functionName];

				if (functionToCall) {
					let functionArgs;
					try {
						functionArgs = JSON.parse(toolCall.function.arguments);
					} catch (error) {
						console.error('Error parsing function arguments:', error);
						continue;
					}

					let functionResponse;
					if (functionName === "listGoals") {
						functionResponse = await functionToCall(chatId);
					} else if (functionName === "addGoal") {
						functionResponse = await functionToCall(chatId, functionArgs.goalText);
					} else if (functionName === "completeGoal") {
						functionResponse = await functionToCall(chatId, functionArgs.goalIndex);
					} else if (functionName === "deleteGoal") {
						functionResponse = await functionToCall(chatId, functionArgs.goalIndex);
					} else if (functionName === "editGoal") {
						functionResponse = await functionToCall(chatId, functionArgs.goalIndex, functionArgs.goalText);
					} else if (functionName === "swap") {
						functionResponse = await functionToCall(chatId, functionArgs.goalIndex1, functionArgs.goalIndex2);
					} else if (functionName === "schedule") {
						functionResponse = await functionToCall(chatId, functionArgs.goalIndex, functionArgs.scheduledTime);
					} else if (functionName === "unschedule") {
						functionResponse = await functionToCall(chatId, functionArgs.goalIndex);
					} else if (functionName === "recurring") {
						functionResponse = await functionToCall(chatId, functionArgs.goalIndex, functionArgs.recurrencePattern);
					} else if (functionName === "unrecurring") {
						functionResponse = await functionToCall(chatId, functionArgs.goalIndex);
					} else if (functionName === "ticketvalue") {
						functionResponse = await functionToCall(chatId);
					} else if (functionName === "setticketvalue") {
						functionResponse = await functionToCall(chatId, functionArgs.value);
					} else if (functionName === "wallet") {
						functionResponse = await functionToCall(chatId);
					} else if (functionName === "rewards") {
						functionResponse = await functionToCall(chatId);
					} else if (functionName === "createreward") {
						functionResponse = await functionToCall(chatId, functionArgs.name, functionArgs.cost);
					} else if (functionName === "redeem") {
						functionResponse = await functionToCall(chatId, functionArgs.rewardIndex);
					} else if (functionName === "honey") {
						functionResponse = await functionToCall(chatId, functionArgs.message);
					} else if (functionName === "partner") {
						functionResponse = await functionToCall(chatId, functionArgs.partnerId);
					} else if (functionName === "note") {
						functionResponse = await functionToCall(chatId, functionArgs.goalIndex, functionArgs.noteText);
					} else if (functionName === "details") {
						functionResponse = await functionToCall(chatId, functionArgs.goalIndex);
					} else if (functionName === "dashboard") {
						functionResponse = await functionToCall(chatId);
					} else if (functionName === "help") {
						functionResponse = await functionToCall();
					} else if (functionName === "release-notes") {
						functionResponse = await functionToCall();
					} else if (functionName === "requestreward") {
						functionResponse = await functionToCall(chatId, functionArgs.rewardDescription);
					}

					secondMessages.push({
						role: "tool",
						tool_call_id: toolCall.id,
						name: functionName,
						content: functionResponse
					});
				}
			}

			// Is there a way to avoid sending a second message if we don't need to? (e.g. if the tool call is just to list goals?)

			const secondResponse = await openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: secondMessages
			});

			const finalResponseMsg = secondResponse.choices[0].message;
			await sendMessage(chatId, finalResponseMsg.content);
		} else {
			console.log("No tool calls");
			await sendMessage(chatId, responseMessage.content);
		}
	} catch (error) {
		console.error('Error in AI handler:', error);
		console.error(error.stack);
		await sendMessage(chatId, "Sorry, I encountered an error while processing your message. Please try again later.");
	}
}

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

module.exports = {
	handleAIMessage
}; 