import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    this.sheetName = process.env.GOOGLE_SHEET_NAME || 'Messages';
  }

  // Initialize Google Sheets API
  async initialize() {
    try {
      let credentials;

      // ใช้ Base64 encoded JSON key
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64) {
        const decodedKey = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf-8');
        credentials = JSON.parse(decodedKey);
      }
      // ใช้ JSON string
      else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      }
      // ใช้ไฟล์ JSON key
      else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
        this.auth = new GoogleAuth({
          keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      }
      else {
        throw new Error('Google Service Account credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_KEY_BASE64, GOOGLE_SERVICE_ACCOUNT_KEY, or GOOGLE_SERVICE_ACCOUNT_KEY_FILE');
      }

      // ถ้ามี credentials แล้ว ให้สร้าง auth
      if (credentials) {
        this.auth = new GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('Google Sheets API initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Sheets API:', error);
      throw error;
    }
  }

  // เพิ่มข้อความลง Google Sheets
  async addMessage(text, userId, messageType = 'TEXT', timestamp = null) {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      const now = timestamp || new Date().toISOString();
      const thaiTime = new Date(now).toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // ข้อมูลที่จะเพิ่มลง sheet
      const values = [
        [
          thaiTime,           // วันที่และเวลา
          userId,             // User ID
          messageType,        // ประเภทข้อความ (TEXT, OCR)
          text,               // ข้อความ
          text.length,        // ความยาวข้อความ
          now                 // ISO timestamp
        ]
      ];

      const request = {
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:F`, // คอลัมน์ A ถึง F
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      };

      const response = await this.sheets.spreadsheets.values.append(request);
      console.log(`✅ Message added to Google Sheets: ${response.data.updates.updatedCells} cells updated`);
      
      return {
        success: true,
        message: 'Message added to Google Sheets successfully',
        updatedCells: response.data.updates.updatedCells
      };

    } catch (error) {
      console.error('❌ Error adding message to Google Sheets:', error);
      return {
        success: false,
        message: `Failed to add message to Google Sheets: ${error.message}`
      };
    }
  }

  // สร้างหัวตาราง (เรียกครั้งเดียวตอนตั้งค่า)
  async createHeaders() {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      const headers = [
        ['วันที่เวลา', 'User ID', 'ประเภท', 'ข้อความ', 'ความยาว', 'Timestamp']
      ];

      const request = {
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A1:F1`,
        valueInputOption: 'RAW',
        resource: {
          values: headers
        }
      };

      await this.sheets.spreadsheets.values.update(request);
      console.log('✅ Headers created in Google Sheets');
      
      return { success: true, message: 'Headers created successfully' };

    } catch (error) {
      console.error('❌ Error creating headers:', error);
      return { success: false, message: `Failed to create headers: ${error.message}` };
    }
  }

  // ดึงข้อมูลจาก Google Sheets
  async getMessages(limit = 100) {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:F`,
      });

      const rows = response.data.values || [];
      
      // ข้าม header row และจำกัดจำนวน
      const messages = rows.slice(1, limit + 1).map(row => ({
        datetime: row[0] || '',
        userId: row[1] || '',
        type: row[2] || '',
        text: row[3] || '',
        length: parseInt(row[4]) || 0,
        timestamp: row[5] || ''
      }));

      return {
        success: true,
        messages: messages,
        total: messages.length
      };

    } catch (error) {
      console.error('❌ Error getting messages from Google Sheets:', error);
      return {
        success: false,
        message: `Failed to get messages: ${error.message}`,
        messages: []
      };
    }
  }

  // ตรวจสอบการเชื่อมต่อ
  async testConnection() {
    try {
      if (!this.spreadsheetId) {
        throw new Error('GOOGLE_SHEETS_ID not configured');
      }

      await this.initialize();
      
      // ลองอ่านข้อมูลจาก sheet
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      console.log(`✅ Connected to Google Sheets: "${response.data.properties.title}"`);
      
      return {
        success: true,
        message: 'Google Sheets connection successful',
        sheetTitle: response.data.properties.title
      };

    } catch (error) {
      console.error('❌ Google Sheets connection failed:', error);
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }
}