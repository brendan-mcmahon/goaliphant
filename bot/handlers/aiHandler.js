const { OpenAI } = require('openai');
const { sendMessage } = require('../bot.js');

const goalRepo = require('../common/goalRepository.js');
const userRepo = require('../common/userRepository.js');
const rewardRepo = require('../common/rewardRepository.js');
const { v4: uuidv4 } = require('uuid');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const availableFunctions = {
  listGoals: async (chatId) => {
    const goals = await goalRepo.getGoals(chatId);
    return goals.map((goal, index) => 
      `${index + 1}. ${goal.Completed ? '✅' : '⬜'} ${goal.Text}`
    ).join('\n');
  },
  
  getTicketCount: async (chatId) => {
    const user = await userRepo.getUser(chatId);
    return user.TicketCount || 0;
  },
  
  listRewards: async (chatId) => {
    const user = await userRepo.getUser(chatId);
    const partnerId = user.Partner;
    if (!partnerId) return "You don't have a partner set up yet.";
    
    const rewards = await rewardRepo.getRewards(partnerId);
    if (!rewards || rewards.length === 0) return "No rewards available.";
    
    return rewards
      .filter(reward => reward.TicketCost !== undefined)
      .map((reward, index) => 
        `${index + 1}. ${reward.Text} (${reward.TicketCost} tickets)`
      ).join('\n');
  },
  
  addGoal: async (chatId, goalText) => {
    if (!goalText || goalText.trim() === '') {
      return "Goal text cannot be empty.";
    }
    
    // Get current goals
    let goals = await goalRepo.getGoals(chatId);
    
    // Create new goal
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
  
  deleteGoal: async (chatId, goalIndex) => {
    const index = parseInt(goalIndex);
    if (isNaN(index) || index < 1) {
      return "Please provide a valid goal number.";
    }
    
    let goals = await goalRepo.getGoals(chatId);
    
    if (index > goals.length) {
      return `You only have ${goals.length} goals. Please specify a valid goal number.`;
    }
    
    const goalToDelete = goals[index - 1];
    
    goals.splice(index - 1, 1);
    
    await goalRepo.updateGoals(chatId, goals);
    
    return `Deleted goal: ${goalToDelete.text}`;
  },
  
  completeGoal: async (chatId, goalIndex) => {
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
  
  uncompleteGoal: async (chatId, goalIndex) => {
    const index = parseInt(goalIndex);
    if (isNaN(index) || index < 1) {
      return "Please provide a valid goal number.";
    }
    
    let goals = await goalRepo.getGoals(chatId);
    
    if (index > goals.length) {
      return `You only have ${goals.length} goals. Please specify a valid goal number.`;
    }
    
    const goal = goals[index - 1];
    
    if (!goal.completed) {
      return `Goal "${goal.text}" is not completed.`;
    }
    
    goal.completed = false;
    
    await goalRepo.updateGoals(chatId, goals);
    
    await userRepo.addTicket(chatId, -1);
    
    return `Marked goal as incomplete: ${goal.text}\nOne ticket has been removed.`;
  },
  
  addNoteToGoal: async (chatId, params) => {
    const { goalIndex, noteText } = params;
    const index = parseInt(goalIndex);
    
    if (isNaN(index) || index < 1) {
      return "Please provide a valid goal number.";
    }
    
    if (!noteText || noteText.trim() === '') {
      return "Note text cannot be empty.";
    }
    
    let goals = await goalRepo.getGoals(chatId);
    
    if (index > goals.length) {
      return `You only have ${goals.length} goals. Please specify a valid goal number.`;
    }
    
    const goal = goals[index - 1];
    
    if (!goal.notes) {
      goal.notes = [];
    }
    
    goal.notes.push({
      text: noteText,
      timestamp: new Date().toISOString()
    });
    
    await goalRepo.updateGoals(chatId, goals);
    
    return `Added note to goal "${goal.text}": ${noteText}`;
  },
  
  getGoalDetails: async (chatId, goalIndex) => {
    const index = parseInt(goalIndex);
    if (isNaN(index) || index < 1) {
      return "Please provide a valid goal number.";
    }
    
    const goals = await goalRepo.getGoals(chatId);
    
    if (index > goals.length) {
      return `You only have ${goals.length} goals. Please specify a valid goal number.`;
    }
    
    const goal = goals[index - 1];
    let details = `*Goal #${index}*: ${goal.text}\n`;
    details += `*Status*: ${goal.completed ? '✅ Completed' : '⬜ Not completed'}\n`;
    
    if (goal.recurringCron) {
      details += `*Recurring*: Yes (${goal.recurringCron})\n`;
    }
    
    if (goal.notes && goal.notes.length > 0) {
      details += '\n*Notes*:\n';
      goal.notes.forEach((note, i) => {
        const date = new Date(note.timestamp).toLocaleString();
        details += `${i + 1}. ${note.text} (${date})\n`;
      });
    } else {
      details += '\nNo notes added to this goal.';
    }
    
    return details;
  },
  
  scheduleGoal: async (chatId, params) => {
    const { goalText, date } = params;
    
    if (!goalText || goalText.trim() === '') {
      return "Goal text cannot be empty.";
    }
    
    if (!date || date.trim() === '') {
      return "Please provide a valid date (MM DD format).";
    }
    
    const [month, day] = date.split(' ').map(n => parseInt(n.trim()));
    
    if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      return "Please provide a valid date in MM DD format.";
    }
    
    const now = new Date();
    const year = now.getFullYear();
    const targetDate = new Date(year, month - 1, day);
    
    if (targetDate < now) {
      targetDate.setFullYear(year + 1);
    }
    
    const formattedDate = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${targetDate.getFullYear()}`;
    
    let goals = await goalRepo.getGoals(chatId);
    goals.push({
      id: uuidv4(),
      text: goalText,
      completed: false,
      scheduled: formattedDate,
      created: new Date().toISOString()
    });
    
    await goalRepo.updateGoals(chatId, goals);
    
    return `Scheduled goal "${goalText}" for ${formattedDate}.`;
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
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTicketCount",
      description: "Get the current ticket count for the user",
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
      name: "listRewards",
      description: "List available rewards that can be redeemed with tickets",
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
      name: "addGoal",
      description: "Add a new goal for the user",
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
      name: "deleteGoal",
      description: "Delete a goal by its number",
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
      name: "uncompleteGoal",
      description: "Mark a completed goal as incomplete",
      parameters: {
        type: "object",
        properties: {
          goalIndex: {
            type: "string",
            description: "The number of the goal to mark as incomplete (1-based)"
          }
        },
        required: ["goalIndex"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addNoteToGoal",
      description: "Add a note to an existing goal",
      parameters: {
        type: "object",
        properties: {
          goalIndex: {
            type: "string",
            description: "The number of the goal to add a note to (1-based)"
          },
          noteText: {
            type: "string",
            description: "The text of the note to add"
          }
        },
        required: ["goalIndex", "noteText"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getGoalDetails",
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
      name: "scheduleGoal",
      description: "Schedule a goal for a future date",
      parameters: {
        type: "object",
        properties: {
          goalText: {
            type: "string",
            description: "The text of the goal to schedule"
          },
          date: {
            type: "string",
            description: "The date to schedule the goal for, in 'MM DD' format (e.g., '12 25' for December 25)"
          }
        },
        required: ["goalText", "date"]
      }
    }
  }
];

async function handleAIMessage(chatId, userMessage) {
  try {
    const messages = [
      {
        role: "system",
        content: `You are Goaliphant, a helpful assistant integrated with a goal tracking Telegram bot. 
        You can help users understand their goals, rewards, and tickets. 
        Be friendly, supportive, and encouraging. Keep responses concise and conversational.
        You can use functions to retrieve real data about the user's goals and tickets, and to manipulate the data as needed.
        
        When users ask you to perform actions like adding, completing, or scheduling goals, use the appropriate function rather than just explaining how to do it.
        Respond naturally as if you're having a conversation, but handle the user's requests efficiently.`
      },
      {
        role: "user",
        content: userMessage
      }
    ];
    
    const response = await openai.chat.completions.create({
	  model: "o3-mini-2025-01-31",
      messages: messages,
      tools: tools,
      tool_choice: "auto"
    });
    
    const responseMessage = response.choices[0].message;
    
    if (responseMessage.tool_calls) {
      const toolCalls = responseMessage.tool_calls;
      
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionToCall = availableFunctions[functionName];
        
        if (functionToCall) {
          let functionArgs;
          try {
            functionArgs = JSON.parse(toolCall.function.arguments);
          } catch (err) {
            console.error("Error parsing function arguments:", err);
            continue;
          }
          
          let functionResponse;
          if (functionName === 'addNoteToGoal' || functionName === 'scheduleGoal') {
            // These functions take objects as parameters
            functionResponse = await functionToCall(chatId, functionArgs);
          } else if (Object.keys(functionArgs).length === 0) {
            // Functions with no args (like listGoals)
            functionResponse = await functionToCall(chatId);
          } else {
            // Functions with a single string parameter
            const arg = Object.values(functionArgs)[0];
            functionResponse = await functionToCall(chatId, arg);
          }
          
          messages.push(responseMessage);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: functionName,
            content: functionResponse
          });
        }
      }
      
      const secondResponse = await openai.chat.completions.create({
        model: "o3-mini-2025-01-31",
        messages: messages
      });
      
      await sendMessage(chatId, secondResponse.choices[0].message.content);
    } else {
      await sendMessage(chatId, responseMessage.content);
    }
  } catch (error) {
    console.error('Error in AI handler:', error);
    await sendMessage(chatId, "Sorry, I encountered an error while processing your message. Please try again later.");
  }
}

module.exports = {
  handleAIMessage
}; 