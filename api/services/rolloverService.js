const { getAllUsers, saveUser } = require('../common/userRepository');
const { getGoals, updateGoals } = require('../common/goalRepository');
const { shouldShowRecurringGoalToday } = require('../common/cronUtils');
const { isScheduledDateInTheFuture } = require('../common/utilities');
const { v4: uuidv4 } = require('uuid');

class RolloverService {
  async performDailyRollover() {
    const startTime = Date.now();
    const users = await getAllUsers();
    const results = {
      successful: [],
      failed: [],
      stats: {
        totalUsers: users.length,
        goalsRolledOver: 0,
        goalsArchived: 0,
        recurringGoalsCreated: 0
      }
    };
    
    for (const user of users) {
      try {
        const rolloverResult = await this.rolloverUserGoals(user.ChatId);
        results.successful.push(rolloverResult);
        
        // Update stats
        results.stats.goalsRolledOver += rolloverResult.rolledOver;
        results.stats.goalsArchived += rolloverResult.archived;
        results.stats.recurringGoalsCreated += rolloverResult.recurringCreated;
      } catch (error) {
        results.failed.push({
          chatId: user.ChatId,
          username: user.Username,
          error: error.message
        });
      }
    }
    
    results.stats.duration = Date.now() - startTime;
    results.stats.successRate = (results.successful.length / users.length) * 100;
    
    // Store rollover results for reporting
    await this.storeRolloverResults(results);
    
    return results;
  }

  async rolloverUserGoals(chatId) {
    const goals = await getGoals(chatId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = {
      chatId,
      date: today.toISOString(),
      rolledOver: 0,
      archived: 0,
      recurringCreated: 0,
      original: goals.length
    };
    
    // Separate goals by status
    const completedGoals = [];
    const incompleteGoals = [];
    const scheduledGoals = [];
    const recurringGoals = [];
    
    for (const goal of goals) {
      if (goal.scheduledDate && isScheduledDateInTheFuture(goal.scheduledDate)) {
        scheduledGoals.push(goal);
      } else if (goal.recurring) {
        recurringGoals.push(goal);
      } else if (goal.completed) {
        completedGoals.push(goal);
      } else {
        incompleteGoals.push(goal);
      }
    }
    
    // Archive completed goals
    if (completedGoals.length > 0) {
      await this.archiveGoals(chatId, completedGoals);
      result.archived = completedGoals.length;
    }
    
    // Process recurring goals
    const newRecurringInstances = await this.processRecurringGoals(chatId, recurringGoals);
    result.recurringCreated = newRecurringInstances.length;
    
    // Build new goals list
    const newGoalsList = [
      ...incompleteGoals,  // Roll over incomplete goals
      ...scheduledGoals,    // Keep scheduled goals
      ...recurringGoals,    // Keep recurring goal templates
      ...newRecurringInstances  // Add new instances of recurring goals
    ];
    
    // Update goals
    await updateGoals(chatId, newGoalsList);
    
    result.rolledOver = incompleteGoals.length;
    result.final = newGoalsList.length;
    
    return result;
  }

  async archiveGoals(chatId, completedGoals) {
    // In a production system, you'd store these in a separate archive table
    // For now, we'll just log them
    const archiveData = {
      chatId,
      archivedAt: new Date().toISOString(),
      goals: completedGoals.map(g => ({
        text: g.text,
        completedAt: g.completedAt,
        notes: g.notes
      }))
    };
    
    // TODO: Store in archive table
    console.log('Archiving goals:', archiveData);
    
    return archiveData;
  }

  async processRecurringGoals(chatId, recurringGoals) {
    const today = new Date();
    const newInstances = [];
    
    for (const goal of recurringGoals) {
      try {
        if (shouldShowRecurringGoalToday(goal.recurring)) {
          // Check if instance already exists for today
          const existingToday = newInstances.find(g => 
            g.parentId === goal.id && 
            g.instanceDate === today.toDateString()
          );
          
          if (!existingToday) {
            // Create today's instance
            const instance = {
              id: uuidv4(),
              text: goal.text,
              completed: false,
              parentId: goal.id,
              instanceDate: today.toDateString(),
              createdAt: new Date().toISOString(),
              fromRecurring: goal.recurring
            };
            
            newInstances.push(instance);
          }
        }
      } catch (error) {
        console.error(`Error processing recurring goal ${goal.id}:`, error);
      }
    }
    
    return newInstances;
  }

  async getRolloverStatus() {
    // Get last rollover results
    const lastRollover = await this.getLastRolloverResults();
    
    if (!lastRollover) {
      return {
        status: 'never_run',
        message: 'Rollover has never been executed'
      };
    }
    
    const lastRun = new Date(lastRollover.date);
    const now = new Date();
    const hoursSince = (now - lastRun) / (1000 * 60 * 60);
    
    if (hoursSince < 20) {
      return {
        status: 'recently_run',
        lastRun: lastRollover.date,
        hoursSince,
        message: 'Rollover was recently executed',
        results: lastRollover
      };
    }
    
    return {
      status: 'ready',
      lastRun: lastRollover.date,
      hoursSince,
      message: 'Rollover is ready to be executed',
      lastResults: lastRollover
    };
  }

  async storeRolloverResults(results) {
    // In production, store in database
    // For now, store in memory
    if (!this.rolloverHistory) {
      this.rolloverHistory = [];
    }
    
    this.rolloverHistory.push({
      ...results,
      date: new Date().toISOString()
    });
    
    // Keep only last 30 days
    if (this.rolloverHistory.length > 30) {
      this.rolloverHistory = this.rolloverHistory.slice(-30);
    }
    
    return results;
  }

  async getLastRolloverResults() {
    if (!this.rolloverHistory || this.rolloverHistory.length === 0) {
      return null;
    }
    
    return this.rolloverHistory[this.rolloverHistory.length - 1];
  }

  async getRolloverHistory(days = 7) {
    if (!this.rolloverHistory) {
      return [];
    }
    
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.rolloverHistory.filter(r => 
      new Date(r.date) > cutoff
    );
  }

  async simulateRollover(chatId) {
    // Dry run for a specific user to preview what would happen
    const goals = await getGoals(chatId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const simulation = {
      chatId,
      currentGoals: goals.length,
      wouldArchive: [],
      wouldRollOver: [],
      wouldCreateRecurring: [],
      scheduledGoals: []
    };
    
    for (const goal of goals) {
      if (goal.scheduledDate && isScheduledDateInTheFuture(goal.scheduledDate)) {
        simulation.scheduledGoals.push(goal.text);
      } else if (goal.recurring) {
        if (shouldShowRecurringGoalToday(goal.recurring)) {
          simulation.wouldCreateRecurring.push({
            text: goal.text,
            pattern: goal.recurring
          });
        }
      } else if (goal.completed) {
        simulation.wouldArchive.push(goal.text);
      } else {
        simulation.wouldRollOver.push(goal.text);
      }
    }
    
    simulation.summary = {
      finalGoalCount: 
        simulation.wouldRollOver.length + 
        simulation.scheduledGoals.length + 
        simulation.wouldCreateRecurring.length,
      archived: simulation.wouldArchive.length,
      rolledOver: simulation.wouldRollOver.length,
      recurringCreated: simulation.wouldCreateRecurring.length
    };
    
    return simulation;
  }
}

module.exports = new RolloverService();