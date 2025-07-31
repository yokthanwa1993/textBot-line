import { middleware, validateSignature } from '@line/bot-sdk';
import { LineService } from '../services/lineService.js';
import { FlexMessageTemplates } from '../utils/flexMessages.js';
import { GoogleSheetsService } from '../services/googleSheetsService.js';

export class WebhookHandler {
  constructor(lineService) {
    this.lineService = lineService;
    this.googleSheetsService = new GoogleSheetsService();
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
    const savedMessage = await this.lineService.addMessage(text, userId);
    
    // เก็บข้อความลง Google Sheets
    try {
      await this.googleSheetsService.addMessage(text);
      console.log('✅ Text message saved to Google Sheets');
    } catch (error) {
      console.error('❌ Failed to save text message to Google Sheets:', error);
    }

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
      // ตรวจสอบ reply token สำหรับ test mode
      if (!replyToken || replyToken === 'test-token-123') {
        console.log('Test image message, skipping reply');
        return { success: true, message: 'Image received (test mode)', sentMessages: 0 };
      }

      // ตรวจสอบว่ามี OCR API URL หรือไม่
      const ocrApiUrl = process.env.OCR_API_URL;
      
      if (!ocrApiUrl) {
        console.log('OCR_API_URL not configured, sending simple confirmation');
        return await this.lineService.replyMessage(replyToken, '✅ ได้รับรูปภาพแล้วครับ แต่ยังไม่ได้ตั้งค่า OCR API');
      }

      // ดาวน์โหลดรูปภาพจาก LINE
      const imageBuffer = await this.lineService.getMessageContent(message.id);
      console.log(`Downloaded image buffer size: ${imageBuffer.length} bytes`);

      // สร้าง URL สำหรับรูปภาพ
      const imageUrl = `https://api-data.line.me/v2/bot/message/${message.id}/content`;
      const lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

      console.log('=== OCR API CALL DEBUG ===');
      console.log('OCR API URL:', ocrApiUrl);
      console.log('Image URL:', imageUrl);
      console.log('Message ID:', message.id);
      console.log('User ID:', userId);
      console.log('Access Token (first 20 chars):', lineChannelAccessToken?.substring(0, 20) + '...');

      // เรียก OCR API ด้วย GET method (wwoom.com format)
      const apiEndpoint = `${ocrApiUrl}?url=${encodeURIComponent(imageUrl)}`;
      console.log('API Endpoint:', apiEndpoint);

      const ocrResponse = await fetch(apiEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${lineChannelAccessToken}`,
          'User-Agent': 'Mozilla/5.0 (compatible; LINE-Bot/1.0)',
          'Cache-Control': 'no-cache'
        }
      });

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        console.error('OCR API error details:', {
          status: ocrResponse.status,
          statusText: ocrResponse.statusText,
          responseText: errorText
        });

        // ส่งข้อความแจ้งเตือนแทน
        return await this.lineService.replyMessage(replyToken, `⚠️ OCR API ไม่สามารถใช้งานได้ในขณะนี้ (Error ${ocrResponse.status})`);
      }

      const ocrResult = await ocrResponse.json();
      console.log('=== OCR RESULT DEBUG ===');
      console.log('OCR Result:', JSON.stringify(ocrResult, null, 2));
      console.log('OCR Text Length:', ocrResult.text?.length || 0);
      console.log('OCR Text Preview:', ocrResult.text?.substring(0, 100) || 'No text');

      // รองรับ OCR API format: { text: "..." }
      const ocrText = ocrResult.text || '';

      if (!ocrText || ocrText.trim() === '') {
        console.log('OCR returned empty text');
        return await this.lineService.replyMessage(replyToken, '⚠️ ไม่พบข้อความในรูปภาพ');
      }

      // บันทึกข้อความ OCR ลงใน storage
      const savedMessage = await this.lineService.addMessage(ocrText, userId);
      console.log('Saved OCR message:', savedMessage);
      
      // เก็บข้อความ OCR ลง Google Sheets
      try {
        await this.googleSheetsService.addMessage(ocrText);
        console.log('✅ OCR message saved to Google Sheets');
      } catch (error) {
        console.error('❌ Failed to save OCR message to Google Sheets:', error);
      }

      // สร้าง Flex Message สำหรับแสดงผล OCR (ใช้ savedMessage.id แทน message.id)
      const flexContents = FlexMessageTemplates.createOCRResultFlex(
        ocrText,
        savedMessage.id, // ใช้ savedMessage.id เพื่อให้สามารถแก้ไขได้
        userId,
        null // ไม่ส่ง imageUrl
      );

      // ส่ง Flex Message ด้วย reply message
      return await this.lineService.replyFlexMessage(replyToken, 'ผลการ OCR', flexContents);

    } catch (error) {
      console.error('Error processing image with OCR:', error);

      // ส่งข้อความแจ้งข้อผิดพลาด
      try {
        return await this.lineService.replyMessage(replyToken, `❌ เกิดข้อผิดพลาด: ${error.message}`);
      } catch (sendError) {
        console.error('Error sending error message:', sendError);
        return { success: false, message: `Failed to process image and send error message: ${error.message}`, sentMessages: 0 };
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