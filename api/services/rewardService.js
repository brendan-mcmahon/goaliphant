const { getRewards, getReward, insertReward, updateReward, deleteReward, getAllRewards } = require('../common/rewardRepository');
const { getUser, addTicket } = require('../common/userRepository');
const { v4: uuidv4 } = require('uuid');

class RewardService {
  async createReward(chatId, rewardData) {
    const reward = {
      id: uuidv4(),
      ChatId: chatId,
      title: rewardData.title,
      description: rewardData.description,
      cost: rewardData.cost,
      createdAt: new Date().toISOString(),
      status: 'active',
      ...rewardData
    };
    
    await insertReward(reward);
    return reward;
  }

  async updateRewardDetails(rewardId, updates) {
    const reward = await getReward(rewardId);
    
    if (!reward) {
      throw new Error(`Reward not found: ${rewardId}`);
    }
    
    const updatedReward = {
      ...reward,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await updateReward(rewardId, updatedReward);
    return updatedReward;
  }

  async deleteRewardById(rewardId) {
    const reward = await getReward(rewardId);
    
    if (!reward) {
      throw new Error(`Reward not found: ${rewardId}`);
    }
    
    await deleteReward(rewardId);
    return reward;
  }

  async listRewards(chatId, options = {}) {
    const rewards = await getRewards(chatId);
    let filteredRewards = [...rewards];
    
    // Filter by status
    if (options.status) {
      filteredRewards = filteredRewards.filter(r => r.status === options.status);
    }
    
    // Filter by availability (user has enough tickets)
    if (options.affordable !== undefined) {
      const user = await getUser(chatId);
      const ticketBalance = user.Tickets || 0;
      filteredRewards = filteredRewards.filter(r => 
        options.affordable ? r.cost <= ticketBalance : r.cost > ticketBalance
      );
    }
    
    // Sort by cost
    if (options.sortBy === 'cost') {
      filteredRewards.sort((a, b) => 
        options.sortOrder === 'desc' ? b.cost - a.cost : a.cost - b.cost
      );
    }
    
    return filteredRewards;
  }

  async requestReward(requesterId, recipientId, request) {
    const requester = await getUser(requesterId);
    const recipient = await getUser(recipientId);
    
    if (!requester) {
      throw new Error('Requester not found');
    }
    if (!recipient) {
      throw new Error('Recipient not found');
    }
    
    const rewardRequest = {
      id: uuidv4(),
      ChatId: recipientId,
      requesterId,
      requesterName: requester.Username || 'Partner',
      title: request.title,
      description: request.description,
      status: 'pending',
      createdAt: new Date().toISOString(),
      type: 'request'
    };
    
    await insertReward(rewardRequest);
    return rewardRequest;
  }

  async approveRewardRequest(rewardId, cost) {
    const reward = await getReward(rewardId);
    
    if (!reward) {
      throw new Error(`Reward request not found: ${rewardId}`);
    }
    
    if (reward.type !== 'request' || reward.status !== 'pending') {
      throw new Error('Invalid reward request');
    }
    
    const approvedReward = {
      ...reward,
      cost,
      status: 'approved',
      approvedAt: new Date().toISOString()
    };
    
    await updateReward(rewardId, approvedReward);
    
    // Create the actual reward for the requester
    const actualReward = {
      id: uuidv4(),
      ChatId: reward.requesterId,
      title: reward.title,
      description: reward.description,
      cost,
      createdAt: new Date().toISOString(),
      status: 'active',
      approvedBy: reward.ChatId,
      originalRequestId: rewardId
    };
    
    await insertReward(actualReward);
    
    return { approvedRequest: approvedReward, createdReward: actualReward };
  }

  async rejectRewardRequest(rewardId) {
    const reward = await getReward(rewardId);
    
    if (!reward) {
      throw new Error(`Reward request not found: ${rewardId}`);
    }
    
    if (reward.type !== 'request' || reward.status !== 'pending') {
      throw new Error('Invalid reward request');
    }
    
    const rejectedReward = {
      ...reward,
      status: 'rejected',
      rejectedAt: new Date().toISOString()
    };
    
    await updateReward(rewardId, rejectedReward);
    return rejectedReward;
  }

  async redeemReward(chatId, rewardId) {
    const reward = await getReward(rewardId);
    const user = await getUser(chatId);
    
    if (!reward) {
      throw new Error(`Reward not found: ${rewardId}`);
    }
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if reward belongs to user
    if (reward.ChatId !== chatId) {
      throw new Error('Reward does not belong to user');
    }
    
    // Check if user has enough tickets
    const ticketBalance = user.Tickets || 0;
    if (ticketBalance < reward.cost) {
      throw new Error(`Insufficient tickets. Need ${reward.cost}, have ${ticketBalance}`);
    }
    
    // Deduct tickets
    await addTicket(chatId, -reward.cost);
    
    // Mark reward as redeemed
    const redeemedReward = {
      ...reward,
      status: 'redeemed',
      redeemedAt: new Date().toISOString()
    };
    
    await updateReward(rewardId, redeemedReward);
    
    return {
      reward: redeemedReward,
      ticketsDeducted: reward.cost,
      remainingTickets: ticketBalance - reward.cost
    };
  }

  async getRewardById(rewardId) {
    const reward = await getReward(rewardId);
    
    if (!reward) {
      throw new Error(`Reward not found: ${rewardId}`);
    }
    
    return reward;
  }

  async getAllRewardsForAllUsers() {
    return await getAllRewards();
  }

  async getPartnerRewards(chatId) {
    const user = await getUser(chatId);
    
    if (!user.Partner) {
      throw new Error('No partner linked');
    }
    
    return await getRewards(user.Partner);
  }
}

module.exports = new RewardService();