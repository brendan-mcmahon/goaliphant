const { sendMessage } = require('../bot.js');

const commands = {
  'add': {
    description: 'Add a goal to your daily list',
    syntax: '/add <goal text>',
    example: '/add Finish project proposal',
    details: 'Adds a new goal to your daily task list.'
  },
  'list': {
    description: 'List your goals',
    syntax: '/list [filter]',
    example: '/list todo',
    details: 'Shows your current goals. Optional filters: all, todo, done, scheduled, today (default).'
  },
  'delete': {
    description: 'Delete a goal',
    syntax: '/delete <number>',
    example: '/delete 2',
    details: 'Removes a goal from your list. Use the number shown in the list command. Make sure you are referring to the default list (or today) and not another filtered list.'
  },
  'edit': {
    description: 'Edit an existing goal',
    syntax: '/edit <number> <new text>',
    example: '/edit 3 Updated goal text',
    details: 'Changes the text of an existing goal. Use the number shown in the list command. Make sure you are referring to the default list (or today) and not another filtered list.'
  },
  'swap': {
    description: 'Swap the position of two goals',
    syntax: '/swap <number1> <number2>',
    example: '/swap 2 5',
    details: 'Exchanges the positions of two goals in your list. Use the numbers shown in the list command. Make sure you are referring to the default list (or today) and not another filtered list.'
  },
  'complete': {
    description: 'Mark a goal as completed',
    syntax: '/complete <number>',
    example: '/complete 1',
    details: 'Marks a goal as completed and awards you a ticket. Use the number shown in the list command. Make sure you are referring to the default list (or today) and not another filtered list.'
  },
  'uncomplete': {
    description: 'Mark a completed goal as incomplete',
    syntax: '/uncomplete <number>',
    example: '/uncomplete 3',
    details: 'Marks a completed goal as incomplete and removes the awarded ticket. Use the number shown in the list command. Make sure you are referring to the default list (or today) and not another filtered list.'
  },
  'wallet': {
    description: 'Check your ticket balance',
    syntax: '/wallet',
    example: '/wallet',
    details: 'Shows how many tickets you currently have.'
  },
  'rewards': {
    description: 'List available rewards',
    syntax: '/rewards',
    example: '/rewards',
    details: 'Shows all rewards you can redeem with your tickets.'
  },
  'createreward': {
    description: 'Create a new reward for your partner',
    syntax: '/createreward',
    example: '/createreward',
    details: 'Starts a guided process to create a new reward for your partner.\n\n' +
      'Walkthrough:\n' +
      '1. Use /createreward to start\n' +
      '2. Enter the reward name/description\n' +
      '3. Enter the number of tickets required\n' +
      '4. Reward will be created and available to your partner'
  },
  'redeem': {
    description: 'Redeem a reward',
    syntax: '/redeem <number>',
    example: '/redeem 2',
    details: 'Spends tickets to claim a reward. Your partner will be notified.'
  },
  'honey': {
    description: 'Add a task to your partner\'s honey-do list',
    syntax: '/honey <task text>',
    example: '/honey Please take out the trash',
    details: 'Adds a task to your partner\'s list. They\'ll be notified when they complete it.'
  },
  'partner': {
    description: 'View your partner\'s goals',
    syntax: '/partner',
    example: '/partner',
    details: 'Shows your partner\'s current goal list.'
  },
  'schedule': {
    description: 'Schedule a goal for a future date',
    syntax: '/schedule <number> <mm dd>',
    example: '/schedule 3 05 15',
    details: 'Schedules an existing goal for a future date (month day).'
  },
  'requestreward': {
    description: 'Request a reward to be created',
    syntax: '/requestreward',
    example: '/requestreward',
    details: 'Starts a guided process to request a reward from your partner.\n\n' +
      'Walkthrough:\n' +
      '1. Use /requestreward to start\n' +
      '2. Enter the reward you want\n' +
      '3. Your partner will receive the request and set a ticket price\n' +
      '4. Once priced, the reward will appear in your rewards list'
  },
  'dashboard': {
    description: 'Get a link to the Goaliphant dashboard',
    syntax: '/dashboard',
    example: '/dashboard',
    details: 'Returns a link to the web dashboard for Goaliphant.'
  },
  'help': {
    description: 'Show help information',
    syntax: '/help [command]',
    example: '/help rewards',
    details: 'Shows list of commands or detailed help for a specific command.'
  }
};

async function getHelp(chatId, commandArg) {
  try {
    if (!commandArg) {
      const helpLines = ['*Available Commands:*'];
      
      Object.keys(commands).forEach(cmd => {
        helpLines.push(`• /${cmd} - ${commands[cmd].description}`);
      });
      
      helpLines.push('\nFor detailed help on a specific command, use: `/help <command>`');
      
      await sendMessage(chatId, helpLines.join('\n'), { parse_mode: 'Markdown' });
    } else {
      const command = commandArg.toLowerCase().replace('/', '');
      
      if (commands[command]) {
        const helpText = [
          `*Command:* /${command}`,
          `*Description:* ${commands[command].description}`,
          `*Syntax:* ${commands[command].syntax}`,
          `*Example:* ${commands[command].example}`,
          `*Details:* ${commands[command].details}`
        ].join('\n\n');
        
        await sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
      } else {
        await sendMessage(chatId, `Unknown command: ${commandArg}. Use /help to see available commands.`);
      }
    }
  } catch (error) {
    console.error('Error in help command:', error);
    await sendMessage(chatId, 'Error processing help command. Please try again.');
  }
}

exports.getHelp = getHelp; 