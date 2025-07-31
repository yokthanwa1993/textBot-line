# Google Sheets Integration Setup

## 1. สร้าง Google Cloud Project

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง Project ใหม่หรือเลือก Project ที่มีอยู่
3. เปิดใช้งาน Google Sheets API:
   - ไปที่ "APIs & Services" > "Library"
   - ค้นหา "Google Sheets API"
   - คลิก "Enable"

## 2. สร้าง Service Account

1. ไปที่ "APIs & Services" > "Credentials"
2. คลิก "Create Credentials" > "Service Account"
3. ใส่ชื่อ Service Account (เช่น "textbot-sheets")
4. คลิก "Create and Continue"
5. เลือก Role: "Editor" หรือ "Google Sheets API > Sheets Editor"
6. คลิก "Done"

## 3. สร้าง Service Account Key

1. ในหน้า Credentials คลิกที่ Service Account ที่สร้าง
2. ไปที่แท็บ "Keys"
3. คลิก "Add Key" > "Create New Key"
4. เลือก "JSON" และคลิก "Create"
5. ไฟล์ JSON จะถูกดาวน์โหลด - เก็บไว้ให้ปลอดภัย

## 4. สร้าง Google Sheets

1. ไปที่ [Google Sheets](https://sheets.google.com/)
2. สร้าง Spreadsheet ใหม่
3. ตั้งชื่อ (เช่น "TextBot Messages")
4. คัดลอก Spreadsheet ID จาก URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

## 5. แชร์ Sheet กับ Service Account

1. ในหน้า Google Sheets คลิก "Share"
2. ใส่ email ของ Service Account (จากไฟล์ JSON: `client_email`)
3. เลือกสิทธิ์ "Editor"
4. คลิก "Send"

## 6. ตั้งค่า Environment Variables

### วิธีที่ 1: ใช้ JSON String
```bash
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SHEET_NAME=Messages
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"textbot-sheets@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

### วิธีที่ 2: ใช้ไฟล์ (สำหรับ local development)
```bash
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SHEET_NAME=Messages
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./service-account-key.json
```

## 7. โครงสร้างข้อมูลใน Google Sheets

| วันที่เวลา | User ID | ประเภท | ข้อความ | ความยาว | Timestamp |
|------------|---------|--------|---------|----------|-----------|
| 01/08/25 10:30:45 | U1234... | TEXT | สวัสดีครับ | 9 | 2025-08-01T03:30:45.123Z |
| 01/08/25 10:31:20 | U1234... | OCR | ข้อความจากรูปภาพ | 18 | 2025-08-01T03:31:20.456Z |

## 8. การทดสอบ

1. ส่งข้อความไปยัง LINE Bot
2. ตรวจสอบใน Google Sheets ว่าข้อมูลถูกบันทึกหรือไม่
3. ดู logs ใน CapRover เพื่อตรวจสอบการทำงาน

## 9. Troubleshooting

### ปัญหาที่พบบ่อย:
- **"Permission denied"**: ตรวจสอบว่าแชร์ Sheet กับ Service Account แล้ว
- **"Spreadsheet not found"**: ตรวจสอบ GOOGLE_SHEETS_ID
- **"Invalid credentials"**: ตรวจสอบ JSON key ใน environment variable
- **"API not enabled"**: เปิดใช้งาน Google Sheets API ใน Google Cloud Console

### การ Debug:
```javascript
// ทดสอบการเชื่อมต่อ
const result = await googleSheetsService.testConnection();
console.log(result);
```