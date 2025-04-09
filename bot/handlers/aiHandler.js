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
  
  completeGoal: async (chatId, goalDescription) => {
    // first, find the goal index with a separate openAI call
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
  }
};

// delete
// edit
// swap
// schedule
// unschedule
// recurring
// unrecurring
// ticketvalue
// setticketvalue
// wallet
// rewards
// createreward
// redeem
// honey
// partner
// note
// details
// dashboard
// help
// release-notes
// requestreward

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

const SYSTEM_PROMPT = `You are Goaliphant, a helpful assistant integrated with a goal tracking Telegram bot. 
You can help users manage their goals by:
- Listing their current goals
- Adding new goals to their list
- Marking goals as completed

Be friendly, supportive, and encouraging. Keep responses concise and conversational.

When users ask you to perform actions like adding or completing goals, use the appropriate function rather than just explaining how to do it.
Respond naturally as if you're having a conversation, but handle the user's requests efficiently.

Don't ask for confirmation if you believe the user's request is clear and unambiguous.

If the user sends a message that isn't an explicit request, let them know and ask them to try again.

Don't ask follow up questions.`;

async function handleAIMessage(chatId, userMessage) {
  try {
    // Create messages array with just system message and current user message
    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: userMessage
      }
    ];
    
    console.log("Sending to OpenAI:", JSON.stringify(messages, null, 2));
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      tools: tools,
      tool_choice: "auto"
    });
    
    const responseMessage = response.choices[0].message;
    console.log("First response:", JSON.stringify(responseMessage, null, 2));
    
    // Handle tool calls if any
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      // Create new messages array including the assistant's response
      const secondMessages = [...messages, responseMessage];
      
      // Process each tool call
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        console.log("Function called:", functionName);
        const functionToCall = availableFunctions[functionName];
        
        if (functionToCall) {
          let functionArgs;
          try {
            functionArgs = JSON.parse(toolCall.function.arguments);
          } catch (error) {
            console.error('Error parsing function arguments:', error);
            continue;
          }
          
          // Handle different function types
          let functionResponse;
          if (functionName === "listGoals") {
            functionResponse = await functionToCall(chatId);
          } else if (functionName === "addGoal") {
            functionResponse = await functionToCall(chatId, functionArgs.goalText);
          } else if (functionName === "completeGoal") {
            functionResponse = await functionToCall(chatId, functionArgs.goalIndex);
          }
          
          console.log("Function response:", functionResponse);
          
          // Add tool response message to the second messages array
          secondMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: functionName,
            content: functionResponse
          });
        }
      }
      
      // Get final response after tool calls
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