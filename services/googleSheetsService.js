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

  // หา Sheet ID จากชื่อ Sheet
  async getSheetId() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const sheet = response.data.sheets.find(s => s.properties.title === this.sheetName);
      return sheet ? sheet.properties.sheetId : 0; // ถ้าไม่เจอให้ใช้ 0
    } catch (error) {
      console.error('Error getting sheet ID:', error);
      return 0; // fallback เป็น 0
    }
  }

  // เพิ่มข้อความลง Google Sheets (แทรกจากล่างขึ้นบน)
  async addMessage(text, timestamp = null) {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      const now = timestamp || new Date();
      // จัดรูปแบบวันที่เป็น DD/MM/YYYY
      const dateFormatted = now.toLocaleDateString('th-TH', {
        timeZone: 'Asia/Bangkok',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // หา Sheet ID ที่ถูกต้อง
      const sheetId = await this.getSheetId();

      // ขั้นตอนที่ 1: แทรกแถวใหม่ที่แถวที่ 2 (หลังหัวตาราง)
      const insertRequest = {
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [{
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: 1, // แทรกที่แถวที่ 2 (index 1)
                endIndex: 2    // แทรก 1 แถว
              },
              inheritFromBefore: true // คัดลอกฟอร์แมตจากแถวก่อนหน้า
            }
          }]
        }
      };

      await this.sheets.spreadsheets.batchUpdate(insertRequest);

      // ขั้นตอนที่ 2: เพิ่มข้อมูลในแถวที่แทรกใหม่
      const values = [
        [
          dateFormatted,      // คอลัมน์ A: วันที่ในรูปแบบ DD/MM/YYYY
          text                // คอลัมน์ B: ข้อความที่จะบันทึก
        ]
      ];

      const updateRequest = {
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A2:B2`, // แถวที่ 2 (แถวที่เพิ่งแทรก)
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      };

      const response = await this.sheets.spreadsheets.values.update(updateRequest);
      console.log(`✅ Message added to Google Sheets: ${response.data.updatedCells} cells updated`);
      
      return {
        success: true,
        message: 'Message added to Google Sheets successfully',
        updatedCells: response.data.updatedCells
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
        ['วันที่', 'ข้อความ'] // เหลือแค่ 2 คอลัมน์
      ];

      const request = {
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A1:B1`, // เปลี่ยนเป็น A1:B1
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
        range: `${this.sheetName}!A:B`, // เปลี่ยนเป็น A:B
      });

      const rows = response.data.values || [];
      
      // ข้าม header row และจำกัดจำนวน
      const messages = rows.slice(1, limit + 1).map(row => ({
        date: row[0] || '',      // วันที่
        text: row[1] || ''       // ข้อความ
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