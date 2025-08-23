const { 
  getUser, 
  saveUser, 
  getAllUsers, 
  addTicket, 
  getTicketCount,
  setChatState,
  getChatState,
  clearChatState
} = require('../common/userRepository');

class UserService {
  async createUser(chatId, username, options = {}) {
    const existingUser = await getUser(chatId);
    
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    const user = {
      ChatId: chatId,
      Username: username,
      Tickets: 0,
      createdAt: new Date().toISOString(),
      ...options
    };
    
    await saveUser(user);
    return user;
  }

  async getUser(chatId) {
    const user = await getUser(chatId);
    
    if (!user) {
      throw new Error(`User not found: ${chatId}`);
    }
    
    return user;
  }

  async updateUser(chatId, updates) {
    const user = await getUser(chatId);
    
    if (!user) {
      throw new Error(`User not found: ${chatId}`);
    }
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Don't allow direct ticket updates through this method
    delete updatedUser.Tickets;
    
    await saveUser(updatedUser);
    return updatedUser;
  }

  async linkPartner(chatId1, chatId2) {
    const user1 = await getUser(chatId1);
    const user2 = await getUser(chatId2);
    
    if (!user1) {
      throw new Error(`User not found: ${chatId1}`);
    }
    if (!user2) {
      throw new Error(`User not found: ${chatId2}`);
    }
    
    // Check if either user already has a partner
    if (user1.Partner && user1.Partner !== chatId2) {
      throw new Error(`User ${chatId1} already has a partner`);
    }
    if (user2.Partner && user2.Partner !== chatId1) {
      throw new Error(`User ${chatId2} already has a partner`);
    }
    
    // Link partners
    user1.Partner = chatId2;
    user2.Partner = chatId1;
    
    await saveUser(user1);
    await saveUser(user2);
    
    return { user1, user2 };
  }

  async unlinkPartner(chatId) {
    const user = await getUser(chatId);
    
    if (!user) {
      throw new Error(`User not found: ${chatId}`);
    }
    
    if (!user.Partner) {
      throw new Error('User has no partner');
    }
    
    const partner = await getUser(user.Partner);
    
    // Unlink both users
    delete user.Partner;
    if (partner) {
      delete partner.Partner;
      await saveUser(partner);
    }
    
    await saveUser(user);
    
    return { user, partner };
  }

  async getTicketBalance(chatId) {
    const count = await getTicketCount(chatId);
    return { 
      chatId, 
      tickets: count || 0 
    };
  }

  async addTickets(chatId, amount) {
    if (amount === 0) {
      throw new Error('Amount must be non-zero');
    }
    
    const user = await getUser(chatId);
    if (!user) {
      throw new Error(`User not found: ${chatId}`);
    }
    
    await addTicket(chatId, amount);
    
    const newBalance = await getTicketCount(chatId);
    
    return {
      chatId,
      ticketsAdded: amount,
      newBalance
    };
  }

  async deductTickets(chatId, amount) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }
    
    const user = await getUser(chatId);
    if (!user) {
      throw new Error(`User not found: ${chatId}`);
    }
    
    const currentBalance = await getTicketCount(chatId);
    
    if (currentBalance < amount) {
      throw new Error(`Insufficient tickets. Need ${amount}, have ${currentBalance}`);
    }
    
    await addTicket(chatId, -amount);
    
    const newBalance = await getTicketCount(chatId);
    
    return {
      chatId,
      ticketsDeducted: amount,
      newBalance
    };
  }

  async getChatHistory(chatId) {
    const user = await getUser(chatId);
    
    if (!user) {
      throw new Error(`User not found: ${chatId}`);
    }
    
    return user.chatHistory || [];
  }

  async updateChatHistory(chatId, messages) {
    const user = await getUser(chatId);
    
    if (!user) {
      throw new Error(`User not found: ${chatId}`);
    }
    
    user.chatHistory = messages;
    await saveUser(user);
    
    return messages;
  }

  async appendToChatHistory(chatId, message) {
    const user = await getUser(chatId);
    
    if (!user) {
      throw new Error(`User not found: ${chatId}`);
    }
    
    if (!user.chatHistory) {
      user.chatHistory = [];
    }
    
    user.chatHistory.push({
      ...message,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 messages
    if (user.chatHistory.length > 50) {
      user.chatHistory = user.chatHistory.slice(-50);
    }
    
    await saveUser(user);
    
    return user.chatHistory;
  }

  async clearChatHistory(chatId) {
    const user = await getUser(chatId);
    
    if (!user) {
      throw new Error(`User not found: ${chatId}`);
    }
    
    user.chatHistory = [];
    await saveUser(user);
    
    return { cleared: true };
  }

  async getChatState(chatId) {
    return await getChatState(chatId);
  }

  async setChatState(chatId, state, data = {}) {
    await setChatState(chatId, state, data);
    return { state, data };
  }

  async clearChatState(chatId) {
    await clearChatState(chatId);
    return { cleared: true };
  }

  async getAllUsers(filters = {}) {
    const allUsers = await getAllUsers();
    let filteredUsers = [...allUsers];
    
    // Filter by partner status
    if (filters.hasPartner !== undefined) {
      filteredUsers = filteredUsers.filter(u => 
        filters.hasPartner ? u.Partner : !u.Partner
      );
    }
    
    // Filter by ticket balance
    if (filters.minTickets !== undefined) {
      filteredUsers = filteredUsers.filter(u => 
        (u.Tickets || 0) >= filters.minTickets
      );
    }
    
    // Filter by notification preferences
    if (filters.notificationsEnabled !== undefined) {
      filteredUsers = filteredUsers.filter(u => 
        u.notificationsEnabled === filters.notificationsEnabled
      );
    }
    
    return filteredUsers;
  }

  async getPartnerInfo(chatId) {
    const user = await getUser(chatId);
    
    if (!user) {
      throw new Error(`User not found: ${chatId}`);
    }
    
    if (!user.Partner) {
      return null;
    }
    
    const partner = await getUser(user.Partner);
    
    if (!partner) {
      // Partner was deleted or doesn't exist
      delete user.Partner;
      await saveUser(user);
      return null;
    }
    
    return {
      chatId: partner.ChatId,
      username: partner.Username,
      tickets: partner.Tickets || 0
    };
  }

  async getUsersForNotification(criteria = {}) {
    const users = await getAllUsers();
    
    return users.filter(user => {
      // Check if user has incomplete goals (would need goal service)
      if (criteria.hasIncompleteGoals) {
        // This would need to be implemented with goal service integration
        return true; // Placeholder
      }
      
      // Check if notifications are enabled
      if (criteria.notificationsEnabled && !user.notificationsEnabled) {
        return false;
      }
      
      // Check last notification time
      if (criteria.minHoursSinceLastNotification) {
        const lastNotification = user.lastNotificationAt;
        if (lastNotification) {
          const hoursSince = (Date.now() - new Date(lastNotification).getTime()) / (1000 * 60 * 60);
          if (hoursSince < criteria.minHoursSinceLastNotification) {
            return false;
          }
        }
      }
      
      return true;
    });
  }
}

module.exports = new UserService();