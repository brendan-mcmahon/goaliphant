const { getUser, saveUser, getAllUsers } = require('../common/userRepository');
const { getGoals } = require('../common/goalRepository');

class NotificationService {
  constructor() {
    // Store pending notifications in memory (in production, use a queue service)
    this.pendingNotifications = [];
  }

  async queueNotification(recipientId, notification) {
    const user = await getUser(recipientId);
    
    if (!user) {
      throw new Error(`Recipient not found: ${recipientId}`);
    }
    
    const notificationData = {
      id: Date.now().toString(),
      recipientId,
      type: notification.type,
      message: notification.message,
      data: notification.data || {},
      createdAt: new Date().toISOString(),
      status: 'pending',
      priority: notification.priority || 'normal'
    };
    
    this.pendingNotifications.push(notificationData);
    
    return notificationData;
  }

  async notifyPartner(chatId, message, type = 'info') {
    const user = await getUser(chatId);
    
    if (!user) {
      throw new Error(`User not found: ${chatId}`);
    }
    
    if (!user.Partner) {
      throw new Error('No partner linked');
    }
    
    return await this.queueNotification(user.Partner, {
      type,
      message,
      data: {
        fromPartner: chatId,
        fromUsername: user.Username
      }
    });
  }

  async sendRewardRequestNotification(fromId, toId, reward) {
    const fromUser = await getUser(fromId);
    const toUser = await getUser(toId);
    
    if (!fromUser || !toUser) {
      throw new Error('User not found');
    }
    
    const message = `${fromUser.Username || 'Your partner'} has requested a reward: "${reward.title}"`;
    
    return await this.queueNotification(toId, {
      type: 'reward_request',
      message,
      data: {
        rewardId: reward.id,
        rewardTitle: reward.title,
        fromUserId: fromId,
        fromUsername: fromUser.Username
      },
      priority: 'high'
    });
  }

  async sendRewardApprovalNotification(rewardId, approverId, requesterId, cost) {
    const approver = await getUser(approverId);
    const requester = await getUser(requesterId);
    
    if (!approver || !requester) {
      throw new Error('User not found');
    }
    
    const message = `Your reward request has been approved by ${approver.Username || 'your partner'} for ${cost} tickets!`;
    
    return await this.queueNotification(requesterId, {
      type: 'reward_approved',
      message,
      data: {
        rewardId,
        cost,
        approvedBy: approverId,
        approverUsername: approver.Username
      },
      priority: 'high'
    });
  }

  async sendCompletionNotification(chatId, completedGoals) {
    const user = await getUser(chatId);
    
    if (!user || !user.Partner) {
      return null;
    }
    
    const goalCount = completedGoals.length;
    const message = `${user.Username || 'Your partner'} just completed ${goalCount} goal${goalCount > 1 ? 's' : ''}!`;
    
    return await this.queueNotification(user.Partner, {
      type: 'goals_completed',
      message,
      data: {
        completedGoals: completedGoals.map(g => g.text),
        completedBy: chatId,
        completedByUsername: user.Username,
        count: goalCount
      }
    });
  }

  async sendDailyReminderNotification(chatId, incompleteGoals) {
    const message = `You have ${incompleteGoals.length} incomplete goal${incompleteGoals.length > 1 ? 's' : ''} for today. Don't forget to complete them!`;
    
    return await this.queueNotification(chatId, {
      type: 'daily_reminder',
      message,
      data: {
        incompleteCount: incompleteGoals.length,
        goals: incompleteGoals.map(g => g.text)
      },
      priority: 'normal'
    });
  }

  async sendTicketAwardNotification(chatId, ticketsAwarded, reason) {
    const message = `You've earned ${ticketsAwarded} ticket${ticketsAwarded > 1 ? 's' : ''} for ${reason}!`;
    
    return await this.queueNotification(chatId, {
      type: 'tickets_awarded',
      message,
      data: {
        ticketsAwarded,
        reason
      }
    });
  }

  async getPendingNotifications(recipientId = null) {
    if (recipientId) {
      return this.pendingNotifications.filter(n => 
        n.recipientId === recipientId && n.status === 'pending'
      );
    }
    
    return this.pendingNotifications.filter(n => n.status === 'pending');
  }

  async markNotificationSent(notificationId) {
    const notification = this.pendingNotifications.find(n => n.id === notificationId);
    
    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }
    
    notification.status = 'sent';
    notification.sentAt = new Date().toISOString();
    
    // Update user's last notification time
    const user = await getUser(notification.recipientId);
    if (user) {
      user.lastNotificationAt = new Date().toISOString();
      await saveUser(user);
    }
    
    return notification;
  }

  async markNotificationFailed(notificationId, error) {
    const notification = this.pendingNotifications.find(n => n.id === notificationId);
    
    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }
    
    notification.status = 'failed';
    notification.failedAt = new Date().toISOString();
    notification.error = error;
    
    return notification;
  }

  async getUsersForDailyReminder() {
    const users = await getAllUsers();
    const eligibleUsers = [];
    
    for (const user of users) {
      // Skip if notifications disabled
      if (user.notificationsEnabled === false) {
        continue;
      }
      
      // Check if user has incomplete goals
      const goals = await getGoals(user.ChatId);
      const incompleteGoals = goals.filter(g => !g.completed && !g.scheduledDate);
      
      if (incompleteGoals.length > 0) {
        // Check last notification time (don't send more than once per day)
        const lastNotification = user.lastNotificationAt;
        if (lastNotification) {
          const hoursSince = (Date.now() - new Date(lastNotification).getTime()) / (1000 * 60 * 60);
          if (hoursSince < 20) { // Less than 20 hours since last notification
            continue;
          }
        }
        
        eligibleUsers.push({
          user,
          incompleteGoals
        });
      }
    }
    
    return eligibleUsers;
  }

  async clearOldNotifications(daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const before = this.pendingNotifications.length;
    
    this.pendingNotifications = this.pendingNotifications.filter(n => {
      const createdAt = new Date(n.createdAt);
      return createdAt > cutoffDate || n.status === 'pending';
    });
    
    const after = this.pendingNotifications.length;
    
    return {
      removed: before - after,
      remaining: after
    };
  }

  async getNotificationStats() {
    const stats = {
      total: this.pendingNotifications.length,
      pending: 0,
      sent: 0,
      failed: 0,
      byType: {},
      byPriority: {
        high: 0,
        normal: 0,
        low: 0
      }
    };
    
    for (const notification of this.pendingNotifications) {
      stats[notification.status]++;
      
      if (!stats.byType[notification.type]) {
        stats.byType[notification.type] = 0;
      }
      stats.byType[notification.type]++;
      
      stats.byPriority[notification.priority || 'normal']++;
    }
    
    return stats;
  }
}

module.exports = new NotificationService();