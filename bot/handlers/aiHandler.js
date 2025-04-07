const { OpenAI } = require('openai');
const { sendMessage } = require('../bot.js');

const goalRepo = require('../common/goalRepository.js');
const { v4: uuidv4 } = require('uuid');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const availableFunctions = {
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
  }
};

const tools = [
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
  }
];

async function handleAIMessage(chatId, userMessage) {
  try {
    const messages = [
      {
        role: "system",
        content: `You are Goaliphant, a helpful assistant integrated with a goal tracking Telegram bot. 
        You can help users add new goals to their list.
        Be friendly, supportive, and encouraging. Keep responses concise and conversational.
        
        When users ask you to add a goal, use the addGoal function rather than just explaining how to do it.
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
    if (responseMessage.function_calls) {
      const toolCalls = responseMessage.function_calls;
      
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
          
          // Extract the goalText parameter
          const goalText = functionArgs.goalText;
          const functionResponse = await functionToCall(chatId, goalText);
          
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