import { middleware, validateSignature } from '@line/bot-sdk';
import { LineService } from '../services/lineService.js';
import { FlexMessageTemplates } from '../utils/flexMessages.js';

export class WebhookHandler {
  constructor(lineService) {
    this.lineService = lineService;
    this.config = {
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      channelSecret: process.env.LINE_CHANNEL_SECRET,
    };
  }

  // Middleware สำหรับตรวจสอบ signature
  getMiddleware() {
    return middleware(this.config);
  }

  // จัดการ webhook events
  async handleEvents(events) {
    const results = await Promise.all(
      events.map(event => this.handleEvent(event))
    );
    return results;
  }

  // จัดการ event แต่ละตัว
  async handleEvent(event) {
    console.log('Received event:', JSON.stringify(event, null, 2));

    switch (event.type) {
      case 'message':
        return await this.handleMessage(event);
      case 'follow':
        return await this.handleFollow(event);
      case 'unfollow':
        return await this.handleUnfollow(event);
      case 'join':
        return await this.handleJoin(event);
      case 'leave':
        return await this.handleLeave(event);
      case 'memberJoined':
        return await this.handleMemberJoined(event);
      case 'memberLeft':
        return await this.handleMemberLeft(event);
      case 'postback':
        return await this.handlePostback(event);
      case 'beacon':
        return await this.handleBeacon(event);
      case 'accountLink':
        return await this.handleAccountLink(event);
      case 'things':
        return await this.handleThings(event);
      default:
        console.log('Unknown event type:', event.type);
        return null;
    }
  }

  // จัดการข้อความ
  async handleMessage(event) {
    const { replyToken, message, source } = event;
    const userId = source.userId;

    switch (message.type) {
      case 'text':
        return await this.handleTextMessage(event);
      case 'image':
        return await this.handleImageMessage(replyToken, message, userId);
      case 'video':
        return await this.handleVideoMessage(replyToken, message, userId);
      case 'audio':
        return await this.handleAudioMessage(replyToken, message, userId);
      case 'file':
        return await this.handleFileMessage(replyToken, message, userId);
      case 'location':
        return await this.handleLocationMessage(replyToken, message, userId);
      case 'sticker':
        return await this.handleStickerMessage(replyToken, message, userId);
      default:
        console.log('Unknown message type:', message.type);
        return null;
    }
  }

  // จัดการข้อความข้อความ
  async handleTextMessage(event) {
    const { text } = event.message;
    const { replyToken, source } = event;
    const userId = source?.userId || 'unknown-user';
    
    console.log(`Received text message from ${userId}: ${text}`);
    
    // เก็บข้อความจริงและได้ messageId
    const savedMessage = this.lineService.addMessage(text, userId);
    
    // ตรวจสอบ reply token สำหรับ test mode
    if (!replyToken || replyToken === 'test-token-123') {
      console.log('Test message, skipping reply');
      return { success: true, message: 'Message received (test mode)', sentMessages: 0 };
    }
    
    const timestamp = new Date().toISOString();
    const flexContents = FlexMessageTemplates.createLiffMessageFlex(text, userId, timestamp, savedMessage.id);
    const altText = `ได้รับข้อความ: ${text}`;

    try {
      const result = await this.lineService.replyFlexMessage(replyToken, altText, flexContents);
      console.log('Flex reply result:', result);
      return result;
    } catch (error) {
      console.error('Error replying with flex message:', error);
      // Fallback to text message if flex fails
      try {
        const fallbackText = `ได้รับข้อความ: "${text}" แล้วครับ ✅`;
        const result = await this.lineService.replyMessage(replyToken, fallbackText);
        console.log('Fallback text reply result:', result);
        return result;
      } catch (fallbackError) {
        console.error('Error with fallback text reply:', fallbackError);
        return { success: false, message: `Failed to reply: ${fallbackError.message}`, sentMessages: 0 };
      }
    }
  }

  // จัดการรูปภาพ
  async handleImageMessage(replyToken, message, userId) {
    console.log(`Image message from ${userId}, messageId: ${message.id}`);
    
    try {
      // ดาวน์โหลดรูปภาพจาก LINE
      const imageBuffer = await this.lineService.getMessageContent(message.id);
      
      // แปลงเป็น base64
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;
      
      // เรียก OCR API ผ่าน external service โดยส่ง base64
      const ocrResponse = await fetch('https://ocr.wwoom.com/api/v1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base64Image: base64Image
        })
      });
      
      if (!ocrResponse.ok) {
        throw new Error(`OCR API error: ${ocrResponse.status}`);
      }
      
      const ocrResult = await ocrResponse.json();
      const timestamp = new Date().toISOString();
      
      // ปรับ format ให้เข้ากับ API response
      const formattedResult = {
        success: ocrResult.text && ocrResult.text.trim() !== '',
        text: ocrResult.text || 'ไม่พบข้อความในรูปภาพ',
        wordCount: ocrResult.text ? ocrResult.text.split(/\s+/).length : 0
      };

      // เก็บข้อความ OCR ในระบบเพื่อใช้กับปุ่ม EDIT
      const savedMessage = this.lineService.addMessage(formattedResult.text, userId);
      
      // สร้าง Flex Message สำหรับผลลัพธ์ OCR
      const flexContents = FlexMessageTemplates.createOCRResultFlex(formattedResult.text, savedMessage.id, userId);
      const altText = formattedResult.success 
        ? `OCR ผลลัพธ์: ${formattedResult.text.substring(0, 50)}${formattedResult.text.length > 50 ? '...' : ''}`
        : 'OCR ไม่พบข้อความในรูปภาพ';

      try {
        // ส่ง Flex Message
        const result = await this.lineService.replyFlexMessage(replyToken, altText, flexContents);
        console.log('OCR Flex reply result:', result);
        return result;
      } catch (flexError) {
        console.error('Error replying with OCR flex message:', flexError);
        
        // Fallback ไปใช้ text message ธรรมดา
        if (formattedResult.success && formattedResult.text) {
          const fallbackText = `📄 ข้อความที่อ่านได้จากรูปภาพ:\n\n${formattedResult.text}`;
          return await this.lineService.replyMessage(replyToken, fallbackText);
        } else {
          return await this.lineService.replyMessage(replyToken, '❌ ไม่พบข้อความในรูปภาพนี้ครับ');
        }
      }
      
    } catch (error) {
      console.error('Error processing image with OCR:', error);
      
      // สร้าง Flex Message สำหรับ error
      const errorResult = {
        success: false,
        text: `เกิดข้อผิดพลาด: ${error.message}`,
        wordCount: 0
      };
      
      try {
        const flexContents = FlexMessageTemplates.createOCRResultFlex(errorResult.text, null, userId);
        const altText = 'OCR เกิดข้อผิดพลาดในการประมวลผลรูปภาพ';
        return await this.lineService.replyFlexMessage(replyToken, altText, flexContents);
      } catch (flexError) {
        // Fallback สุดท้าย
        return await this.lineService.replyMessage(replyToken, '❌ เกิดข้อผิดพลาดในการอ่านข้อความจากรูปภาพ กรุณาลองใหม่อีกครั้ง');
      }
    }
  }

  // จัดการวิดีโอ
  async handleVideoMessage(replyToken, message, userId) {
    console.log(`Video message from ${userId}`);
    return await this.lineService.replyMessage(replyToken, 'ได้รับวิดีโอแล้วครับ! 🎥');
  }

  // จัดการเสียง
  async handleAudioMessage(replyToken, message, userId) {
    console.log(`Audio message from ${userId}`);
    return await this.lineService.replyMessage(replyToken, 'ได้รับไฟล์เสียงแล้วครับ! 🎵');
  }

  // จัดการไฟล์
  async handleFileMessage(replyToken, message, userId) {
    console.log(`File message from ${userId}:`, message.fileName);
    return await this.lineService.replyMessage(replyToken, `ได้รับไฟล์ "${message.fileName}" แล้วครับ! 📄`);
  }

  // จัดการตำแหน่ง
  async handleLocationMessage(replyToken, message, userId) {
    const { title, address, latitude, longitude } = message;
    console.log(`Location from ${userId}: ${title} at ${latitude}, ${longitude}`);
    return await this.lineService.replyMessage(replyToken, `ได้รับตำแหน่ง "${title}" แล้วครับ! 📍`);
  }

  // จัดการสติกเกอร์
  async handleStickerMessage(replyToken, message, userId) {
    console.log(`Sticker from ${userId}: ${message.packageId}/${message.stickerId}`);
    // ตอบกลับด้วยสติกเกอร์
    return await this.lineService.replyMessage(replyToken, 'ขอบคุณสำหรับสติกเกอร์ครับ! 😊');
  }

  // จัดการการ follow
  async handleFollow(event) {
    const userId = event.source.userId;
    console.log(`User ${userId} followed the bot`);
    
    const welcomeMessage = 'ยินดีต้อนรับครับ! 🎉\nขอบคุณที่เพิ่มเป็นเพื่อนนะครับ';
    return await this.lineService.replyMessage(event.replyToken, welcomeMessage);
  }

  // จัดการการ unfollow
  async handleUnfollow(event) {
    const userId = event.source.userId;
    console.log(`User ${userId} unfollowed the bot`);
    // ไม่สามารถส่งข้อความหาผู้ใช้ที่ unfollow แล้ว
    return null;
  }

  // จัดการการเข้ากลุ่ม
  async handleJoin(event) {
    const { groupId, roomId } = event.source;
    console.log(`Bot joined group/room: ${groupId || roomId}`);
    
    const welcomeMessage = 'สวัสดีครับ! ขอบคุณที่เชิญมาเข้ากลุ่มนะครับ 🤖';
    return await this.lineService.replyMessage(event.replyToken, welcomeMessage);
  }

  // จัดการการออกจากกลุ่ม
  async handleLeave(event) {
    const { groupId, roomId } = event.source;
    console.log(`Bot left group/room: ${groupId || roomId}`);
    return null;
  }

  // จัดการสมาชิกเข้ากลุ่ม
  async handleMemberJoined(event) {
    console.log('Member joined:', event.joined.members);
    const welcomeMessage = 'ยินดีต้อนรับสมาชิกใหม่ครับ! 👋';
    return await this.lineService.replyMessage(event.replyToken, welcomeMessage);
  }

  // จัดการสมาชิกออกจากกลุ่ม
  async handleMemberLeft(event) {
    console.log('Member left:', event.left.members);
    return null;
  }

  // จัดการ postback
  async handlePostback(event) {
    const { data, params } = event.postback;
    console.log(`Postback data: ${data}`, params);
    
    // ตรวจสอบ reply token สำหรับ test mode
    if (!event.replyToken || event.replyToken === 'test-reply-token') {
      console.log('Test postback, skipping reply');
      return { success: true, message: 'Postback received (test mode)', sentMessages: 0 };
    }
    
    // ตรวจสอบ action
    if (data.startsWith('action=save_and_open_liff')) {
      const urlParams = new URLSearchParams(data.replace('action=save_and_open_liff&', ''));
      const msg = urlParams.get('message') || '';
      const uid = urlParams.get('userId') || '';
      const mid = urlParams.get('messageId') || '';
      // บันทึกข้อความ
      await this.lineService.addMessage(msg, uid);
      // ส่ง Flex Message ตอบกลับ
      const ts = new Date().toISOString(); // ใช้ ISO string แทน
      const flex = FlexMessageTemplates.createTextResultFlex(msg, uid, ts, mid);
      const alt = 'บันทึกข้อความแล้ว';
      return await this.lineService.replyFlexMessage(event.replyToken, alt, flex);
    } else if (data.startsWith('action=save_and_close_liff')) {
      // กรณีเปิด LIFF บันทึกและปิดหน้า ให้ส่ง Flex Message ยืนยันการบันทึก
      const params = new URLSearchParams(data.replace('action=save_and_close_liff&', ''));
      const msg = params.get('message') || '';
      const uid = params.get('userId') || '';
      const mid = params.get('messageId') || '';
      
      // บันทึกข้อความลงระบบก่อน
      const savedMessage = await this.lineService.addMessage(msg, uid);
      console.log('=== SAVE_AND_CLOSE_LIFF DEBUG ===');
      console.log('Message:', msg);
      console.log('UserId:', uid);
      console.log('SavedMessage:', savedMessage);
      
      const ts = new Date().toISOString();
      const flex = FlexMessageTemplates.createEditResultFlex(msg, uid, ts, savedMessage.id);
      console.log('Generated Flex:', JSON.stringify(flex, null, 2));
      const alt = 'แก้ไขข้อความสำเร็จ';
      console.log('Alt text:', alt);
      
      const result = await this.lineService.replyFlexMessage(event.replyToken, alt, flex);
      console.log('Reply result:', result);
      return result;
    } else {
      // กรณีอื่นๆ ตอบกลับข้อความปกติ
      const replyMessage = `ได้รับ postback: ${data}`;
      return await this.lineService.replyMessage(event.replyToken, replyMessage);
    }
  }

  // จัดการ beacon
  async handleBeacon(event) {
    const { hwid, type } = event.beacon;
    console.log(`Beacon event: ${type} from ${hwid}`);
    
    const replyMessage = 'ตรวจพบ Beacon แล้วครับ! 📡';
    return await this.lineService.replyMessage(event.replyToken, replyMessage);
  }

  // จัดการ account link
  async handleAccountLink(event) {
    const { result, nonce } = event.link;
    console.log(`Account link: ${result}, nonce: ${nonce}`);
    
    const replyMessage = result === 'ok' ? 'เชื่อมต่อบัญชีสำเร็จ! ✅' : 'เชื่อมต่อบัญชีไม่สำเร็จ ❌';
    return await this.lineService.replyMessage(event.replyToken, replyMessage);
  }

  // จัดการ LINE Things
  async handleThings(event) {
    console.log('LINE Things event:', event.things);
    const replyMessage = 'ได้รับข้อมูลจาก LINE Things แล้วครับ! 🔗';
    return await this.lineService.replyMessage(event.replyToken, replyMessage);
  }
}