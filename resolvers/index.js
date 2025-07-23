import { FlexMessageTemplates } from '../utils/flexMessages.js';

export const resolvers = {
  Query: {
    // Messages - ใช้งานจริง
    messages: async (_, { userId, limit, orderBy, order }, { lineService }) => {
      return await lineService.getMessages({ userId, limit, orderBy, order });
    },
    
    // Health check
    health: () => {
      return 'GraphQL LINE API is running!';
    },
  },

  Mutation: {
    // Send Messages
    sendTextMessage: async (_, { input }, { lineService }) => {
      try {
        // ส่งแค่ flex message หัว EDIT สำหรับความสอดคล้อง
        const timestamp = new Date().toISOString();
        
        // สร้าง Flex Message หัว EDIT แบบเดียวกับ editTextMessage
        const flexContent = {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              { 
                type: "text", 
                text: "EDIT", 
                weight: "bold", 
                size: "lg", 
                color: "#FFFFFF", 
                align: "center" 
              }
            ],
            backgroundColor: "#F39C12",
            paddingAll: "md"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "บันทึกข้อความแล้ว ✅",
                weight: "bold",
                color: "#27AE60",
                margin: "md"
              },
              {
                type: "separator",
                margin: "lg"
              },
              {
                type: "text",
                text: input.text,
                wrap: true,
                color: "#333333",
                margin: "lg"
              },
              {
                type: "separator",
                margin: "lg"
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "🕒 เวลา:",
                    size: "sm",
                    color: "#666666",
                    flex: 2
                  },
                  {
                    type: "text",
                    text: timestamp,
                    size: "sm",
                    color: "#333333",
                    flex: 3
                  }
                ]
              }
            ]
          }
        };

        // ส่ง flex message กลับไป
        const flexResult = await lineService.sendFlexMessage(input.to, "บันทึกข้อความแล้ว", JSON.stringify(flexContent));
        
        return flexResult;
        
      } catch (error) {
        console.error('Error sending flex message:', error);
        return { success: false, message: `Failed to send message: ${error.message}`, sentMessages: 0 };
      }
    },

    // Edit Text Message - ส่ง Flex Message หัว EDIT (สีส้ม)
    editTextMessage: async (_, { input }, { lineService }) => {
      try {
        const timestamp = new Date().toISOString();
        
        // สร้าง Flex Message หัวสีส้ม เหมือนใน /sent page
        const flexContent = {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            contents: [
              { 
                type: "text", 
                text: "EDIT", 
                weight: "bold", 
                size: "lg", 
                color: "#FFFFFF", 
                align: "center" 
              }
            ],
            backgroundColor: "#F39C12",
            paddingAll: "md"
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "บันทึกข้อความแล้ว ✅",
                weight: "bold",
                color: "#27AE60",
                margin: "md"
              },
              {
                type: "separator",
                margin: "lg"
              },
              {
                type: "text",
                text: input.text,
                wrap: true,
                color: "#333333",
                margin: "lg"
              },
              {
                type: "separator",
                margin: "lg"
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "🕒 เวลา:",
                    size: "sm",
                    color: "#666666",
                    flex: 2
                  },
                  {
                    type: "text",
                    text: timestamp,
                    size: "sm",
                    color: "#333333",
                    flex: 3
                  }
                ]
              }
            ]
          }
        };

        // ส่ง Flex Message
        const flexResult = await lineService.sendFlexMessage(input.to, "บันทึกข้อความแล้ว", JSON.stringify(flexContent));
        return flexResult;
        
      } catch (error) {
        console.error('Error sending edit flex message:', error);
        return { success: false, message: `Failed to send edit message: ${error.message}`, sentMessages: 0 };
      }
    },

    // Add Message to storage
    addMessage: async (_, { text, userId }, { lineService }) => {
      return await lineService.addMessage(text, userId);
    },

    // Edit Message in storage
    editMessage: async (_, { messageId, newText, userId }, { lineService }) => {
      console.log(`🔧 editMessage called: messageId=${messageId}, newText="${newText}", userId=${userId}`);
      
      const updatedMessage = await lineService.editMessage(messageId, newText);
      
      if (updatedMessage) {
        console.log(`✅ Message updated successfully:`, updatedMessage);
        try {
          const flexContent = FlexMessageTemplates.createEditResultFlex(
            updatedMessage.text,
            userId,
            updatedMessage.timestamp,
            updatedMessage.id
          );
          // ส่ง Flex Message เป็น JSON string
          console.log(`📤 Sending edit confirmation Flex Message to ${userId}`);
          await lineService.sendFlexMessage(userId, "แก้ไขข้อความสำเร็จ", JSON.stringify(flexContent));
          console.log(`✅ Edit confirmation Flex Message sent successfully`);
        } catch (flexError) {
          console.error('❌ Error sending edit confirmation flex message:', flexError);
        }
      } else {
        console.log(`❌ Message not found for messageId: ${messageId}`);
      }
      return updatedMessage;
    },

    sendImageMessage: async (_, { input }, { lineService }) => {
      const { to, originalContentUrl, previewImageUrl } = input;
      return await lineService.sendImageMessage(to, originalContentUrl, previewImageUrl);
    },

    sendVideoMessage: async (_, { input }, { lineService }) => {
      const { to, originalContentUrl, previewImageUrl } = input;
      return await lineService.sendVideoMessage(to, originalContentUrl, previewImageUrl);
    },

    sendAudioMessage: async (_, { input }, { lineService }) => {
      const { to, originalContentUrl, duration } = input;
      return await lineService.sendAudioMessage(to, originalContentUrl, duration);
    },

    sendLocationMessage: async (_, { input }, { lineService }) => {
      const { to, title, address, latitude, longitude } = input;
      return await lineService.sendLocationMessage(to, title, address, latitude, longitude);
    },

    sendStickerMessage: async (_, { input }, { lineService }) => {
      const { to, packageId, stickerId } = input;
      return await lineService.sendStickerMessage(to, packageId, stickerId);
    },

    sendFlexMessage: async (_, { input }, { lineService }) => {
      const { to, altText, contents } = input;
      // Send contents as string to LineService which will parse it
      return await lineService.sendFlexMessage(to, altText, contents);
    },

    // Multicast & Broadcast
    multicastMessage: async (_, { to, text }, { lineService }) => {
      return await lineService.multicastMessage(to, text);
    },

    broadcastMessage: async (_, { text }, { lineService }) => {
      return await lineService.broadcastMessage(text);
    },

    // Reply Messages
    replyMessage: async (_, { replyToken, text }, { lineService }) => {
      return await lineService.replyMessage(replyToken, text);
    },

    replyWithMultipleMessages: async (_, { replyToken, messages }, { lineService }) => {
      return await lineService.replyWithMultipleMessages(replyToken, messages);
    },

    // Rich Menu Management
    createRichMenu: async (_, { input }, { lineService }) => {
      const { size, selected, name, chatBarText, areas } = input;
      return await lineService.createRichMenu(size, selected, name, chatBarText, areas);
    },

    deleteRichMenu: async (_, { richMenuId }, { lineService }) => {
      return await lineService.deleteRichMenu(richMenuId);
    },

    setUserRichMenu: async (_, { userId, richMenuId }, { lineService }) => {
      return await lineService.setUserRichMenu(userId, richMenuId);
    },

    unlinkUserRichMenu: async (_, { userId }, { lineService }) => {
      return await lineService.unlinkUserRichMenu(userId);
    },

    setDefaultRichMenu: async (_, { richMenuId }, { lineService }) => {
      return await lineService.setDefaultRichMenu(richMenuId);
    },

    cancelDefaultRichMenu: async (_, __, { lineService }) => {
      return await lineService.cancelDefaultRichMenu();
    },

    // Group & Room Management
    leaveGroup: async (_, { groupId }, { lineService }) => {
      return await lineService.leaveGroup(groupId);
    },

    leaveRoom: async (_, { roomId }, { lineService }) => {
      return await lineService.leaveRoom(roomId);
    },

    // Webhook Management
    setWebhookEndpoint: async (_, { endpoint }, { lineService }) => {
      return await lineService.setWebhookEndpoint(endpoint);
    },
  },
};