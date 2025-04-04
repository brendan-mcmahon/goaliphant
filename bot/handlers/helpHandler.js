const { sendMessage } = require('../bot.js');

const commands = {
  'add': {
    description: 'Add a goal to your daily list',
    syntax: '/add <goal text>',
    example: '/add Finish project proposal'
  },
  'list': {
    description: 'List your goals',
    syntax: '/list [filter]',
    example: '/list todo',
    details: 'Optional filters: all, todo, done, scheduled, today (default).'
  },
  'delete': {
    description: 'Delete a goal',
    syntax: '/delete <number>',
    example: '/delete 2',
    details: 'Make sure you are referring to the default list (or today) and not another filtered list.'
  },
  'edit': {
    description: 'Edit an existing goal',
    syntax: '/edit <number> <new text>',
    example: '/edit 3 Updated goal text',
    details: 'Make sure you are referring to the default list (or today) and not another filtered list.'
  },
  'swap': {
    description: 'Swap the position of two goals',
    syntax: '/swap <number1> <number2>',
    example: '/swap 2 5',
    details: 'Make sure you are referring to the default list (or today) and not another filtered list.'
  },
  'complete': {
    description: 'Mark a goal as completed',
    syntax: '/complete <number>',
    example: '/complete 1',
    details: 'Awards you a ticket upon completion.'
  },
  'uncomplete': {
    description: 'Mark a completed goal as incomplete',
    syntax: '/uncomplete <number>',
    example: '/uncomplete 3',
    details: 'Removes the previously awarded ticket.'
  },
  'wallet': {
    description: 'Check your ticket balance',
    syntax: '/wallet',
    example: '/wallet'
  },
  'rewards': {
    description: 'List available rewards',
    syntax: '/rewards',
    example: '/rewards'
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
    details: 'Your partner will be notified when they complete it.'
  },
  'partner': {
    description: 'View your partner\'s goals',
    syntax: '/partner',
    example: '/partner'
  },
  'schedule': {
    description: 'Schedule a goal for a future date',
    syntax: '/schedule <number> <mm dd>',
    example: '/schedule 3 05 15'
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
    example: '/dashboard'
  },
  'help': {
    description: 'Show help information',
    syntax: '/help [command]',
    example: '/help rewards'
  },
  'note': {
    description: 'Add a note to a specific goal',
    syntax: '/note {goal number} {note text}',
    example: '/note 2 This is important to finish by Friday!'
  },
  'details': {
    description: 'View all details and notes for a specific goal',
    syntax: '/details {goal number}',
    example: '/details 2'
  }
};

async function getHelp(chatId, commandArg) {
  try {
    if (!commandArg) {
      const helpLines = ['*Available Commands:*'];
      
      Object.keys(commands).forEach(cmd => {
        helpLines.push(`• ${cmd} - ${commands[cmd].description}`);
      });
      
      helpLines.push('\nFor detailed help on a specific command, use: `/help <command>`');
      
      await sendMessage(chatId, helpLines.join('\n'), { parse_mode: 'Markdown' });
    } else {
      const command = commandArg.toLowerCase().replace('/', '');
      
      if (commands[command]) {
        let helpText = [
          `*Command:* ${command}`,
          `*Description:* ${commands[command].description}`,
          `*Syntax:* ${commands[command].syntax}`,
          `*Example:* ${commands[command].example}`
        ].join('\n\n');

		if (commands[command].details) {
			helpText += `\n\n*Details:* ${commands[command].details}`;
		}
        
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