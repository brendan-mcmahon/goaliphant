const { OpenAI } = require('openai');
const { sendMessage } = require('../bot.js');

const goalRepo = require('../common/goalRepository.js');
const userRepo = require('../common/userRepository.js');
const { v4: uuidv4 } = require('uuid');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const availableFunctions = {
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
  
  completeGoal: async (chatId, goalIndex) => {
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
  }
];

async function handleAIMessage(chatId, userMessage) {
  try {
    const messages = [
      {
        role: "system",
        content: `You are Goaliphant, a helpful assistant integrated with a goal tracking Telegram bot. 
        You can help users manage their goals by:
        - Listing their current goals
        - Adding new goals to their list
        - Marking goals as completed
        
        Be friendly, supportive, and encouraging. Keep responses concise and conversational.
        
        When users ask you to perform actions like adding or completing goals, use the appropriate function rather than just explaining how to do it.
        Respond naturally as if you're having a conversation, but handle the user's requests efficiently.`
      },
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
    console.log("first response", responseMessage);
    if (responseMessage.tool_calls) {
      const toolCalls = responseMessage.tool_calls;
      
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        console.log("functionName", functionName);
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
          if (functionName === 'listGoals') {
            // listGoals takes no arguments
            functionResponse = await functionToCall(chatId);
          } else if (functionName === 'addGoal') {
            // Extract the goalText parameter
            const goalText = functionArgs.goalText;
            functionResponse = await functionToCall(chatId, goalText);
          } else if (functionName === 'completeGoal') {
            // Extract the goalIndex parameter
            const goalIndex = functionArgs.goalIndex;
            functionResponse = await functionToCall(chatId, goalIndex);
          }
          
          console.log("functionResponse", functionResponse);
          
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
        model: "gpt-4o-mini",
        messages: messages
      });
      
      await sendMessage(chatId, secondResponse.choices[0].message.content);
    } else {
      console.log("no tool calls");
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