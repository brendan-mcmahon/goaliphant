/**
 * Utility functions for working with cron expressions
 */

/**
 * Determines if a cron expression matches the current date (ignoring time)
 * @param {string} cronExpression - Cron expression in format "* * day month weekday"
 * @param {Date} dateToCheck - Date to check against (defaults to today)
 * @returns {boolean} - Whether the cron expression matches the date
 */
function isCronMatchingDate(cronExpression, dateToCheck = new Date()) {
    if (!cronExpression) return false;
    
    // Parse the cron expression
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length < 5) return false;
    
    // We only care about day, month, weekday for daily goals
    // Ignore minute and hour parts (index 0 and 1)
    const [, , dayOfMonth, month, dayOfWeek] = parts;
    
    // Get date components
    const currentDayOfMonth = dateToCheck.getDate();     // 1-31
    const currentMonth = dateToCheck.getMonth() + 1;     // 1-12
    const currentDayOfWeek = dateToCheck.getDay();       // 0-6 (Sunday = 0)
    
    // For daily recurring goals, we only check date parts
    if (!matchesCronPart(dayOfMonth, currentDayOfMonth)) return false;
    if (!matchesCronPart(month, currentMonth)) return false;
    if (!matchesCronPart(dayOfWeek, currentDayOfWeek)) return false;
    
    return true;
}

/**
 * Check if a specific date component matches a cron part
 * @param {string} cronPart - The cron part to check (e.g. "1,15" or "*" or "1-5")
 * @param {number} dateComponent - The date component to check against
 * @returns {boolean} - Whether the date component matches the cron part
 */
function matchesCronPart(cronPart, dateComponent) {
    // Handle "*" (any value)
    if (cronPart === '*') return true;
    
    // Handle lists (e.g. "1,3,5")
    if (cronPart.includes(',')) {
        return cronPart.split(',').some(part => matchesCronPart(part, dateComponent));
    }
    
    // Handle ranges (e.g. "1-5")
    if (cronPart.includes('-')) {
        const [start, end] = cronPart.split('-').map(Number);
        return dateComponent >= start && dateComponent <= end;
    }
    
    // Handle steps (e.g. "*/5")
    if (cronPart.includes('/')) {
        const [range, step] = cronPart.split('/');
        const numStep = parseInt(step);
        
        if (range === '*') {
            return dateComponent % numStep === 0;
        }
        
        // Handle range with step
        if (range.includes('-')) {
            const [start, end] = range.split('-').map(Number);
            if (dateComponent < start || dateComponent > end) return false;
            return (dateComponent - start) % numStep === 0;
        }
    }
    
    // Simple value
    return parseInt(cronPart) === dateComponent;
}

/**
 * Determines if a goal with a recurring schedule should be shown today
 * @param {Object} goal - The goal object with recurringSchedule
 * @returns {boolean} - Whether the goal should be shown today
 */
function shouldShowRecurringGoalToday(goal) {
    if (!goal.isRecurring || !goal.recurringSchedule) return false;
    
    return isCronMatchingDate(goal.recurringSchedule);
}

module.exports = {
    isCronMatchingDate,
    shouldShowRecurringGoalToday
}; 