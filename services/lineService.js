import { Client } from '@line/bot-sdk';

export class LineService {
  constructor() {
    this.client = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      channelSecret: process.env.LINE_CHANNEL_SECRET,
    });
    
    // เก็บข้อความจริงใน memory
    this.messages = [];
    this.messageIdCounter = 1;
  }

  // === Message Storage ===
  addMessage(text, userId) {
    const message = {
      id: this.messageIdCounter.toString(),
      text: text,
      userId: userId,
      timestamp: new Date().toISOString()
    };
    
    this.messages.push(message);
    this.messageIdCounter++;
    
    console.log(`เก็บข้อความใหม่: ${text} จากผู้ใช้: ${userId}`);
    return message;
  }

  editMessage(messageId, newText) {
    const messageIndex = this.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex !== -1) {
      this.messages[messageIndex].text = newText;
      this.messages[messageIndex].timestamp = new Date().toISOString();
      console.log(`แก้ไขข้อความ ID: ${messageId} เป็น: ${newText}`);
      return this.messages[messageIndex];
    }
    console.log(`ไม่พบข้อความ ID: ${messageId} ที่จะแก้ไข`);
    return null;
  }

  // === Message Retrieval ===
  async getMessages(options = {}) {
    try {
      let filteredMessages = [...this.messages];
      
      // กรองตาม userId ถ้ามี
      if (options.userId) {
        filteredMessages = filteredMessages.filter(msg => msg.userId === options.userId);
      }
      
      // เรียงลำดับ
      const orderBy = options.orderBy || 'timestamp';
      const order = options.order || 'ASC';
      
      filteredMessages.sort((a, b) => {
        const aValue = a[orderBy];
        const bValue = b[orderBy];
        
        if (orderBy === 'timestamp') {
          const aTime = new Date(aValue).getTime();
          const bTime = new Date(bValue).getTime();
          return order === 'DESC' ? bTime - aTime : aTime - bTime;
        }
        
        if (order === 'DESC') {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
      });
      
      // จำกัดจำนวน
      if (options.limit && options.limit > 0) {
        filteredMessages = filteredMessages.slice(0, options.limit);
      }
      
      return filteredMessages;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw new Error(`Failed to get messages: ${error.message}`);
    }
  }

  async getMessageById(messageId) {
    try {
      const message = this.messages.find(msg => msg.id === messageId);
      return message || null;
    } catch (error) {
      console.error('Error getting message by ID:', error);
      throw new Error(`Failed to get message: ${error.message}`);
    }
  }

  // === Message Content ===
  async getMessageContent(messageId) {
    try {
      const stream = await this.client.getMessageContent(messageId);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error getting message content:', error);
      throw new Error(`Failed to get message content: ${error.message}`);
    }
  }

  // === Profile & User Info ===
  async getUserProfile(userId) {
    try {
      const profile = await this.client.getProfile(userId);
      return {
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage,
        language: profile.language,
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  async getGroupSummary(groupId) {
    try {
      const summary = await this.client.getGroupSummary(groupId);
      return {
        groupId: summary.groupId,
        groupName: summary.groupName,
        pictureUrl: summary.pictureUrl,
      };
    } catch (error) {
      console.error('Error getting group summary:', error);
      throw new Error(`Failed to get group summary: ${error.message}`);
    }
  }

  async getRoomSummary(roomId) {
    try {
      const summary = await this.client.getRoomSummary(roomId);
      return { roomId: summary.roomId };
    } catch (error) {
      console.error('Error getting room summary:', error);
      throw new Error(`Failed to get room summary: ${error.message}`);
    }
  }

  // === Message Sending ===
  async sendTextMessage(to, text) {
    try {
      const message = { type: 'text', text };
      await this.client.pushMessage(to, message);
      return { success: true, message: 'Text message sent successfully', sentMessages: 1 };
    } catch (error) {
      console.error('Error sending text message:', error);
      return { success: false, message: `Failed to send message: ${error.message}`, sentMessages: 0 };
    }
  }

  async sendImageMessage(to, originalContentUrl, previewImageUrl) {
    try {
      const message = { type: 'image', originalContentUrl, previewImageUrl };
      await this.client.pushMessage(to, message);
      return { success: true, message: 'Image message sent successfully', sentMessages: 1 };
    } catch (error) {
      console.error('Error sending image message:', error);
      return { success: false, message: `Failed to send image: ${error.message}`, sentMessages: 0 };
    }
  }

  async sendVideoMessage(to, originalContentUrl, previewImageUrl) {
    try {
      const message = { type: 'video', originalContentUrl, previewImageUrl };
      await this.client.pushMessage(to, message);
      return { success: true, message: 'Video message sent successfully', sentMessages: 1 };
    } catch (error) {
      console.error('Error sending video message:', error);
      return { success: false, message: `Failed to send video: ${error.message}`, sentMessages: 0 };
    }
  }

  async sendAudioMessage(to, originalContentUrl, duration) {
    try {
      const message = { type: 'audio', originalContentUrl, duration };
      await this.client.pushMessage(to, message);
      return { success: true, message: 'Audio message sent successfully', sentMessages: 1 };
    } catch (error) {
      console.error('Error sending audio message:', error);
      return { success: false, message: `Failed to send audio: ${error.message}`, sentMessages: 0 };
    }
  }

  async sendLocationMessage(to, title, address, latitude, longitude) {
    try {
      const message = { type: 'location', title, address, latitude, longitude };
      await this.client.pushMessage(to, message);
      return { success: true, message: 'Location message sent successfully', sentMessages: 1 };
    } catch (error) {
      console.error('Error sending location message:', error);
      return { success: false, message: `Failed to send location: ${error.message}`, sentMessages: 0 };
    }
  }

  async sendStickerMessage(to, packageId, stickerId) {
    try {
      const message = { type: 'sticker', packageId, stickerId };
      await this.client.pushMessage(to, message);
      return { success: true, message: 'Sticker message sent successfully', sentMessages: 1 };
    } catch (error) {
      console.error('Error sending sticker message:', error);
      return { success: false, message: `Failed to send sticker: ${error.message}`, sentMessages: 0 };
    }
  }

  async sendFlexMessage(to, altText, contents) {
    try {
      const message = { type: 'flex', altText, contents: JSON.parse(contents) };
      await this.client.pushMessage(to, message);
      return { success: true, message: 'Flex message sent successfully', sentMessages: 1 };
    } catch (error) {
      console.error('Error sending flex message:', error);
      return { success: false, message: `Failed to send flex message: ${error.message}`, sentMessages: 0 };
    }
  }

  // Method ใหม่สำหรับส่ง Flex Message โดยตรง
  async sendFlexMessageObject(to, altText, flexContents) {
    try {
      const message = { type: 'flex', altText, contents: flexContents };
      await this.client.pushMessage(to, message);
      return { success: true, message: 'Flex message sent successfully', sentMessages: 1 };
    } catch (error) {
      console.error('Error sending flex message object:', error);
      return { success: false, message: `Failed to send flex message: ${error.message}`, sentMessages: 0 };
    }
  }

  // Method สำหรับ reply ด้วย Flex Message
  async replyFlexMessage(replyToken, altText, flexContents) {
    try {
      const message = { type: 'flex', altText, contents: flexContents };
      await this.client.replyMessage(replyToken, message);
      return { success: true, message: 'Flex reply sent successfully', sentMessages: 1 };
    } catch (error) {
      console.error('Error replying with flex message:', error);
      return { success: false, message: `Failed to reply with flex message: ${error.message}`, sentMessages: 0 };
    }
  }

  // === Multicast & Broadcast ===
  async multicastMessage(to, text) {
    try {
      const message = { type: 'text', text };
      await this.client.multicast(to, message);
      return { success: true, message: 'Multicast message sent successfully', sentMessages: to.length };
    } catch (error) {
      console.error('Error multicasting message:', error);
      return { success: false, message: `Failed to multicast: ${error.message}`, sentMessages: 0 };
    }
  }

  async broadcastMessage(text) {
    try {
      const message = { type: 'text', text };
      await this.client.broadcast(message);
      return { success: true, message: 'Broadcast message sent successfully', sentMessages: -1 };
    } catch (error) {
      console.error('Error broadcasting message:', error);
      return { success: false, message: `Failed to broadcast: ${error.message}`, sentMessages: 0 };
    }
  }

  // === Reply Messages ===
  async replyMessage(replyToken, text) {
    try {
      const message = { type: 'text', text };
      await this.client.replyMessage(replyToken, message);
      return { success: true, message: 'Reply sent successfully', sentMessages: 1 };
    } catch (error) {
      console.error('Error replying to message:', error);
      return { success: false, message: `Failed to reply: ${error.message}`, sentMessages: 0 };
    }
  }

  async replyWithMultipleMessages(replyToken, messages) {
    try {
      const messageObjects = messages.map(text => ({ type: 'text', text }));
      await this.client.replyMessage(replyToken, messageObjects);
      return { success: true, message: 'Multiple replies sent successfully', sentMessages: messages.length };
    } catch (error) {
      console.error('Error replying with multiple messages:', error);
      return { success: false, message: `Failed to reply: ${error.message}`, sentMessages: 0 };
    }
  }

  // === Rich Menu ===
  async getRichMenuList() {
    try {
      const richMenus = await this.client.getRichMenuList();
      return richMenus.map(menu => ({
        richMenuId: menu.richMenuId,
        size: JSON.stringify(menu.size),
        selected: menu.selected,
        name: menu.name,
        chatBarText: menu.chatBarText,
        areas: menu.areas.map(area => ({
          bounds: area.bounds,
          action: JSON.stringify(area.action),
        })),
      }));
    } catch (error) {
      console.error('Error getting rich menu list:', error);
      throw new Error(`Failed to get rich menu list: ${error.message}`);
    }
  }

  async getUserRichMenu(userId) {
    try {
      const richMenu = await this.client.getRichMenu(userId);
      return {
        richMenuId: richMenu.richMenuId,
        size: JSON.stringify(richMenu.size),
        selected: richMenu.selected,
        name: richMenu.name,
        chatBarText: richMenu.chatBarText,
        areas: richMenu.areas.map(area => ({
          bounds: area.bounds,
          action: JSON.stringify(area.action),
        })),
      };
    } catch (error) {
      console.error('Error getting user rich menu:', error);
      throw new Error(`Failed to get user rich menu: ${error.message}`);
    }
  }

  // === Bot Info & Statistics ===
  async getBotInfo() {
    try {
      const info = await this.client.getBotInfo();
      return {
        userId: info.userId,
        displayName: info.displayName,
        pictureUrl: info.pictureUrl,
        statusMessage: info.statusMessage,
      };
    } catch (error) {
      console.error('Error getting bot info:', error);
      throw new Error(`Failed to get bot info: ${error.message}`);
    }
  }

  async getQuota() {
    try {
      // Note: getMessageQuota method may not be available in this SDK version
      return {
        type: 'limited',
        value: 1000,
      };
    } catch (error) {
      console.error('Error getting quota:', error);
      throw new Error(`Failed to get quota: ${error.message}`);
    }
  }

  async getDefaultRichMenu() {
    try {
      const richMenu = await this.client.getDefaultRichMenu();
      return {
        richMenuId: richMenu.richMenuId,
        size: JSON.stringify(richMenu.size),
        selected: richMenu.selected,
        name: richMenu.name,
        chatBarText: richMenu.chatBarText,
        areas: richMenu.areas.map(area => ({
          bounds: area.bounds,
          action: JSON.stringify(area.action),
        })),
      };
    } catch (error) {
      console.error('Error getting default rich menu:', error);
      throw new Error(`Failed to get default rich menu: ${error.message}`);
    }
  }

  async createRichMenu(size, selected, name, chatBarText, areas) {
    try {
      const richMenu = {
        size: JSON.parse(size),
        selected,
        name,
        chatBarText,
        areas: JSON.parse(areas),
      };
      const richMenuId = await this.client.createRichMenu(richMenu);
      return { success: true, message: `Rich menu created: ${richMenuId}`, sentMessages: 0 };
    } catch (error) {
      console.error('Error creating rich menu:', error);
      return { success: false, message: `Failed to create rich menu: ${error.message}`, sentMessages: 0 };
    }
  }

  async deleteRichMenu(richMenuId) {
    try {
      await this.client.deleteRichMenu(richMenuId);
      return { success: true, message: 'Rich menu deleted successfully', sentMessages: 0 };
    } catch (error) {
      console.error('Error deleting rich menu:', error);
      return { success: false, message: `Failed to delete rich menu: ${error.message}`, sentMessages: 0 };
    }
  }

  async setUserRichMenu(userId, richMenuId) {
    try {
      await this.client.linkRichMenuToUser(userId, richMenuId);
      return { success: true, message: 'Rich menu linked to user successfully', sentMessages: 0 };
    } catch (error) {
      console.error('Error linking rich menu to user:', error);
      return { success: false, message: `Failed to link rich menu: ${error.message}`, sentMessages: 0 };
    }
  }

  async unlinkUserRichMenu(userId) {
    try {
      await this.client.unlinkRichMenuFromUser(userId);
      return { success: true, message: 'Rich menu unlinked from user successfully', sentMessages: 0 };
    } catch (error) {
      console.error('Error unlinking rich menu from user:', error);
      return { success: false, message: `Failed to unlink rich menu: ${error.message}`, sentMessages: 0 };
    }
  }

  async setDefaultRichMenu(richMenuId) {
    try {
      await this.client.setDefaultRichMenu(richMenuId);
      return { success: true, message: 'Default rich menu set successfully', sentMessages: 0 };
    } catch (error) {
      console.error('Error setting default rich menu:', error);
      return { success: false, message: `Failed to set default rich menu: ${error.message}`, sentMessages: 0 };
    }
  }

  async cancelDefaultRichMenu() {
    try {
      await this.client.deleteDefaultRichMenu();
      return { success: true, message: 'Default rich menu cancelled successfully', sentMessages: 0 };
    } catch (error) {
      console.error('Error cancelling default rich menu:', error);
      return { success: false, message: `Failed to cancel default rich menu: ${error.message}`, sentMessages: 0 };
    }
  }

  // === Message Quota ===
  async getMessageQuota() {
    try {
      const quota = await this.client.getMessageQuotaConsumption();
      return {
        totalUsage: quota.totalUsage,
      };
    } catch (error) {
      console.error('Error getting message quota:', error);
      throw new Error(`Failed to get message quota: ${error.message}`);
    }
  }

  // === Webhook Management ===
  async getWebhookInfo() {
    try {
      const info = await this.client.getWebhookEndpoint();
      return {
        endpoint: info.endpoint,
        active: info.active,
      };
    } catch (error) {
      console.error('Error getting webhook info:', error);
      throw new Error(`Failed to get webhook info: ${error.message}`);
    }
  }

  async setWebhookEndpoint(endpoint) {
    try {
      await this.client.setWebhookEndpoint(endpoint);
      return { success: true, message: 'Webhook endpoint set successfully', sentMessages: 0 };
    } catch (error) {
      console.error('Error setting webhook endpoint:', error);
      return { success: false, message: `Failed to set webhook endpoint: ${error.message}`, sentMessages: 0 };
    }
  }

  async testWebhook(endpoint) {
    try {
      await this.client.testWebhookEndpoint(endpoint);
      return { success: true, message: 'Webhook test successful', sentMessages: 0 };
    } catch (error) {
      console.error('Error testing webhook:', error);
      return { success: false, message: `Webhook test failed: ${error.message}`, sentMessages: 0 };
    }
  }

  // === Insights (Analytics) ===
  async getInsight(date) {
    try {
      // Note: Insight API requires specific implementation based on your needs
      // This is a placeholder implementation
      return {
        overview: `Insight data for ${date}`,
        messages: 'Message statistics',
        followers: 'Follower statistics',
      };
    } catch (error) {
      console.error('Error getting insight:', error);
      throw new Error(`Failed to get insight: ${error.message}`);
    }
  }

  // === Group & Room Management ===
  async leaveGroup(groupId) {
    try {
      await this.client.leaveGroup(groupId);
      return { success: true, message: 'Left group successfully', sentMessages: 0 };
    } catch (error) {
      console.error('Error leaving group:', error);
      return { success: false, message: `Failed to leave group: ${error.message}`, sentMessages: 0 };
    }
  }

  async leaveRoom(roomId) {
    try {
      await this.client.leaveRoom(roomId);
      return { success: true, message: 'Left room successfully', sentMessages: 0 };
    } catch (error) {
      console.error('Error leaving room:', error);
      return { success: false, message: `Failed to leave room: ${error.message}`, sentMessages: 0 };
    }
  }
}