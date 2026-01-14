#!/usr/bin/env python3
"""
Migration Script: ย้ายข้อมูลจาก JSON files ไปยัง PostgreSQL
Migration Script: Migrate data from JSON files to PostgreSQL

วิธีใช้:
1. ตรวจสอบว่า PostgreSQL ทำงานอยู่และมีฐานข้อมูล ev_station_db แล้ว
2. ตรวจสอบว่าไฟล์ .env ตั้งค่าถูกต้อง
3. รันคำสั่ง: python database/migrate_from_json.py
"""

import os
import sys
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from datetime import datetime

# เพิ่ม parent directory เข้า path เพื่อ import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# โหลด environment variables
load_dotenv()

# การตั้งค่าฐานข้อมูล
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'ev_station_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '')
}

# โฟลเดอร์ที่เก็บ JSON files
DATA_DIR = 'saved_data'

def migrate_data():
    """ย้ายข้อมูลจาก JSON files ไปยัง PostgreSQL"""
    
    # ตรวจสอบว่ามีโฟลเดอร์ saved_data หรือไม่
    if not os.path.exists(DATA_DIR):
        print(f"⚠️ ไม่พบโฟลเดอร์ {DATA_DIR}")
        print("ไม่มีข้อมูลที่ต้องย้าย")
        return
    
    # เชื่อมต่อฐานข้อมูล
    try:
        print("🔌 กำลังเชื่อมต่อฐานข้อมูล PostgreSQL...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        print("✅ เชื่อมต่อฐานข้อมูลสำเร็จ")
    except Exception as e:
        print(f"❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้: {e}")
        print("\nกรุณาตรวจสอบ:")
        print("1. PostgreSQL ทำงานอยู่หรือไม่")
        print("2. ฐานข้อมูล ev_station_db สร้างแล้วหรือยัง")
        print("3. ข้อมูลในไฟล์ .env ถูกต้องหรือไม่")
        return
    
    # นับจำนวนไฟล์ JSON
    json_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    
    if not json_files:
        print(f"⚠️ ไม่พบไฟล์ JSON ในโฟลเดอร์ {DATA_DIR}")
        cursor.close()
        conn.close()
        return
    
    print(f"\n📁 พบไฟล์ JSON จำนวน {len(json_files)} ไฟล์")
    print("=" * 50)
    
    success_count = 0
    error_count = 0
    skipped_count = 0
    
    # อ่านและย้ายข้อมูลแต่ละไฟล์
    for filename in json_files:
        filepath = os.path.join(DATA_DIR, filename)
        customer_code = filename.replace('.json', '')
        
        try:
            # อ่านไฟล์ JSON
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # ตรวจสอบว่ามีข้อมูลในฐานข้อมูลแล้วหรือยัง
            cursor.execute(
                "SELECT customer_code FROM customer_data WHERE customer_code = %s",
                (customer_code,)
            )
            exists = cursor.fetchone()
            
            if exists:
                print(f"⏭️  ข้าม {customer_code} (มีข้อมูลในฐานข้อมูลแล้ว)")
                skipped_count += 1
                continue
            
            # เพิ่ม timestamp ถ้ายังไม่มี
            if 'savedAt' not in data:
                data['savedAt'] = datetime.now().isoformat()
            if 'lastUpdated' not in data:
                data['lastUpdated'] = datetime.now().isoformat()
            
            # บันทึกลงฐานข้อมูล
            cursor.execute(
                """INSERT INTO customer_data (customer_code, data) 
                   VALUES (%s, %s)""",
                (customer_code, json.dumps(data, ensure_ascii=False))
            )
            
            print(f"✅ ย้ายข้อมูล {customer_code} สำเร็จ")
            success_count += 1
            
        except json.JSONDecodeError as e:
            print(f"❌ ข้อผิดพลาดในการอ่านไฟล์ {filename}: {e}")
            error_count += 1
        except psycopg2.Error as e:
            print(f"❌ ข้อผิดพลาดฐานข้อมูลสำหรับ {customer_code}: {e}")
            error_count += 1
        except Exception as e:
            print(f"❌ ข้อผิดพลาดสำหรับ {customer_code}: {e}")
            error_count += 1
    
    # Commit การเปลี่ยนแปลง
    try:
        conn.commit()
        print("\n" + "=" * 50)
        print("📊 สรุปผลการย้ายข้อมูล:")
        print(f"   ✅ สำเร็จ: {success_count} ไฟล์")
        print(f"   ⏭️  ข้าม: {skipped_count} ไฟล์")
        print(f"   ❌ ผิดพลาด: {error_count} ไฟล์")
        print("=" * 50)
        
        if success_count > 0:
            print("\n💡 คำแนะนำ:")
            print("   - ข้อมูลถูกย้ายไปยังฐานข้อมูล PostgreSQL แล้ว")
            print("   - คุณสามารถลบโฟลเดอร์ saved_data ได้ (แต่แนะนำให้สำรองไว้ก่อน)")
            print("   - หรือเก็บไว้เป็น backup")
    except Exception as e:
        conn.rollback()
        print(f"\n❌ เกิดข้อผิดพลาดในการ commit: {e}")
    
    cursor.close()
    conn.close()
    print("\n✅ เสร็จสิ้น")

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Migration Script: JSON Files → PostgreSQL")
    print("=" * 50)
    print()
    
    migrate_data()

