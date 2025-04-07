const { getGoals, updateGoals } = require('../common/goalRepository.js');
const { sendMessage, sendError } = require('../bot.js');

/**
 * Makes a goal recurring with the specified date pattern
 * @param {string} goalNumber - The number of the goal to make recurring
 * @param {string} cronPattern - The date pattern for recurrence (day month weekday)
 * @param {number} chatId - The chat ID of the user
 */
async function makeGoalRecurring(goalNumber, cronPattern, chatId) {
    try {
        // Validate input
        const index = parseInt(goalNumber) - 1;
        
        if (isNaN(index) || index < 0) {
            await sendMessage(chatId, '⚠️ Please provide a valid goal number.');
            return;
        }

        // Process the cron pattern - we only need day, month, weekday
        // If user provides full cron expression, use it as is
        // Otherwise, construct one with wildcards for time components
        let cronExpression = cronPattern.trim();
        const parts = cronExpression.split(/\s+/);
        
        if (parts.length < 3) {
            await sendMessage(chatId, '⚠️ Invalid date pattern. Please provide at least day, month, and weekday components.');
            return;
        } else if (parts.length === 3) {
            // User provided just the date components (day month weekday)
            cronExpression = `* * ${cronExpression}`;
        } else if (parts.length < 5) {
            await sendMessage(chatId, '⚠️ Invalid cron expression. Please provide either 3 components (day month weekday) or the full 5 components.');
            return;
        }
        
        if (!isValidCronExpression(cronExpression)) {
            await sendMessage(chatId, '⚠️ Invalid cron expression. Please use a valid format.');
            return;
        }

        // Get the goals
        const goals = await getGoals(chatId);
        
        if (!goals || goals.length === 0) {
            await sendMessage(chatId, '⚠️ You have no goals. Add some with /add');
            return;
        }

        if (index >= goals.length) {
            await sendMessage(chatId, `⚠️ You only have ${goals.length} goals. Please provide a valid number.`);
            return;
        }

        // Update the goal with recurring information
        const goalToUpdate = goals[index];
        goalToUpdate.isRecurring = true;
        goalToUpdate.recurringSchedule = cronExpression;
        
        // Save the updated goals
        await updateGoals(chatId, goals);
        
        // Create a human-readable description of the schedule
        const scheduleDescription = getHumanReadableSchedule(cronExpression);
        
        await sendMessage(chatId, `✅ Goal "${goalToUpdate.text}" is now recurring ${scheduleDescription}`);
    } catch (error) {
        console.error('Error making goal recurring:', error);
        await sendError(chatId, error);
    }
}

/**
 * Creates a human-readable description of a cron schedule
 * @param {string} cronExpression - The cron expression
 * @returns {string} - Human-readable description
 */
function getHumanReadableSchedule(cronExpression) {
    const parts = cronExpression.trim().split(/\s+/);
    const [, , day, month, weekday] = parts;
    
    if (day === '*' && month === '*' && weekday === '*') {
        return 'every day';
    }
    
    if (day === '*' && month === '*') {
        if (weekday === '1') return 'every Monday';
        if (weekday === '2') return 'every Tuesday';
        if (weekday === '3') return 'every Wednesday';
        if (weekday === '4') return 'every Thursday';
        if (weekday === '5') return 'every Friday';
        if (weekday === '6') return 'every Saturday';
        if (weekday === '0') return 'every Sunday';
        
        if (weekday === '1,2,3,4,5') return 'on weekdays';
        if (weekday === '0,6') return 'on weekends';
    }
    
    return `on schedule: ${cronExpression}`;
}

/**
 * Validates a cron expression (basic validation)
 * @param {string} cron - The cron expression to validate
 * @returns {boolean} - Whether the cron expression is valid
 */
function isValidCronExpression(cron) {
    // Basic validation - checks if there are at least 5 parts in the cron expression
    const parts = cron.split(' ');
    return parts.length >= 5;
}

module.exports = {
    makeGoalRecurring
}; 