#!/usr/bin/env python3
"""
Typhoon OCR API Server - GraphQL Version
รองรับการ OCR จาก URL และ base64 โดยไม่ต้องดาวน์โหลดลงเครื่อง
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl
import requests
import base64
import logging
import os
import tempfile
from dotenv import load_dotenv
from typing import Optional
from typhoon_ocr import ocr_document
import io
from PIL import Image

# โหลด environment variables
load_dotenv('config.env')

# ตั้งค่า logging
logging.basicConfig(level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')))
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Typhoon OCR GraphQL API",
    description="GraphQL API สำหรับ OCR เอกสารและรูปภาพจาก URL หรือ base64",
    version="2.0.0"
)

class OCRRequest(BaseModel):
    url: Optional[HttpUrl] = None
    base64Image: Optional[str] = None
    authorization: Optional[str] = None
    task_type: Optional[str] = "default"
    page_num: Optional[int] = 1

class OCRResponse(BaseModel):
    success: bool
    text: Optional[str] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None

def process_image_from_url(url: str, authorization: Optional[str] = None) -> tuple[bytes, int]:
    """ดึงรูปภาพจาก URL โดยไม่บันทึกลงเครื่อง"""
    try:
        headers = {}
        if authorization:
            headers['Authorization'] = authorization
        
        response = requests.get(url, stream=True, timeout=30, headers=headers)
        response.raise_for_status()
        
        # อ่านข้อมูลเป็น bytes
        image_data = response.content
        file_size = len(image_data)
        
        logger.info(f"ดึงรูปภาพสำเร็จ: {url} (ขนาด: {file_size} bytes)")
        return image_data, file_size
        
    except requests.exceptions.RequestException as e:
        logger.error(f"ไม่สามารถดึงรูปภาพได้: {e}")
        raise HTTPException(status_code=400, detail=f"ไม่สามารถดึงรูปภาพได้: {e}")

def process_base64_image(base64_data: str) -> tuple[bytes, int]:
    """แปลง base64 เป็น bytes"""
    try:
        # ลบ data:image/...;base64, prefix ถ้ามี
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]
        
        image_data = base64.b64decode(base64_data)
        file_size = len(image_data)
        
        logger.info(f"แปลง base64 สำเร็จ (ขนาด: {file_size} bytes)")
        return image_data, file_size
        
    except Exception as e:
        logger.error(f"ไม่สามารถแปลง base64 ได้: {e}")
        raise HTTPException(status_code=400, detail=f"ไม่สามารถแปลง base64 ได้: {e}")

def process_ocr_in_memory(image_data: bytes, task_type: str = "default", page_num: int = 1) -> str:
    """ประมวลผล OCR จาก bytes โดยไม่บันทึกลงเครื่อง"""
    try:
        # สร้างไฟล์ชั่วคราว
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        temp_file.write(image_data)
        temp_file.close()
        
        # ประมวลผล OCR
        result = ocr_document(
            pdf_or_image_path=temp_file.name,
            task_type=task_type,
            page_num=page_num
        )
        
        # ลบไฟล์ชั่วคราว
        os.unlink(temp_file.name)
        
        return result
        
    except Exception as e:
        logger.error(f"ไม่สามารถประมวลผล OCR ได้: {e}")
        raise HTTPException(status_code=500, detail=f"ไม่สามารถประมวลผล OCR ได้: {e}")

@app.post("/api/v1/ocr")
async def process_ocr_graphql(request: OCRRequest) -> OCRResponse:
    """GraphQL-style OCR endpoint"""
    import time
    start_time = time.time()
    
    try:
        # ตรวจสอบ input
        if not request.url and not request.base64Image:
            raise HTTPException(status_code=400, detail="ระบุได้แค่ URL หรือ base64Image อย่างใดอย่างหนึ่ง")
        
        if request.url and request.base64Image:
            raise HTTPException(status_code=400, detail="ระบุได้แค่ URL หรือ base64Image อย่างใดอย่างหนึ่ง")
        
        image_data = None
        file_size = None
        
        # ดึงรูปภาพ
        if request.url:
            logger.info(f"เริ่มประมวลผล OCR จาก URL: {request.url}")
            image_data, file_size = process_image_from_url(str(request.url), request.authorization)
        else:
            logger.info("เริ่มประมวลผล OCR จาก base64")
            image_data, file_size = process_base64_image(request.base64Image)
        
        # ประมวลผล OCR
        text = process_ocr_in_memory(image_data, request.task_type, request.page_num)
        
        processing_time = time.time() - start_time
        
        return OCRResponse(
            success=True,
            text=text,
            processing_time=processing_time,
            file_size=file_size,
            file_type="Image"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"เกิดข้อผิดพลาด: {e}")
        return OCRResponse(
            success=False,
            error=str(e)
        )

@app.get("/api/v1/")
async def process_ocr_get(url: str, authorization: Optional[str] = None) -> OCRResponse:
    """GET endpoint สำหรับ URL"""
    request = OCRRequest(url=url, authorization=authorization)
    return await process_ocr_graphql(request)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Typhoon OCR GraphQL API",
        "version": "2.0.0",
        "endpoints": {
            "POST /api/v1/ocr": "GraphQL-style OCR endpoint",
            "GET /api/v1/?url=...": "Simple URL OCR endpoint",
            "GET /": "API information"
        },
        "features": [
            "รองรับ URL และ base64",
            "ไม่ดาวน์โหลดไฟล์ลงเครื่อง",
            "รองรับ Authorization header",
            "GraphQL-style API"
        ]
    } 