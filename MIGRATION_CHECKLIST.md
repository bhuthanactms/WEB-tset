# ✅ Checklist: การย้ายข้อมูลจาก localStorage ไป PostgreSQL Database

เอกสารนี้สรุปสิ่งที่ต้องมีและตรวจสอบความครบถ้วนในการย้ายข้อมูลจาก localStorage ไปยัง PostgreSQL

---

## 📋 สิ่งที่ต้องมี (Requirements)

### 1. ✅ Database Schema
- [x] `database/schema.sql` - SQL schema สำหรับสร้างตาราง
- [x] `database/schema.dbml` - DBML schema สำหรับ visualization

### 2. ✅ Backend API (Express + Prisma)
- [x] `server/index.js` - Express API กับ Prisma integration
  - [x] `POST /api/save-data` - บันทึกข้อมูล
  - [x] `GET /api/load-data/<customer_code>` - โหลดข้อมูล
  - [x] `GET /api/list-customers` - รายการลูกค้า
  - [x] `GET /api/health` - ตรวจสอบสถานะ

### 3. ✅ Migration Script
- [x] `database/migrate_from_json.py` - Script สำหรับย้ายข้อมูลจาก JSON files ไป PostgreSQL

### 4. ✅ Frontend Integration
- [x] `src/pages/StationAccessory.tsx` - มีการเรียกใช้ API
  - [x] บันทึกข้อมูลไปยัง `/api/save-data`
  - [x] โหลดข้อมูลจาก `/api/load-data/<customer_code>`

### 5. ⚠️ Environment Configuration
- [ ] ไฟล์ `.env` (ต้องสร้างเอง)
  - [ ] `DB_HOST=localhost`
  - [ ] `DB_PORT=5432`
  - [ ] `DB_NAME=ev_station_db`
  - [ ] `DB_USER=postgres`
  - [ ] `DB_PASSWORD=<your_password>`

### 6. ✅ Dependencies
- [x] `package.json` - มี dependencies ครบ:
  - [x] `express`
  - [x] `cors`
  - [x] `prisma` / `@prisma/client`
  - [x] `dotenv`

---

## 🔄 การทำงานของระบบ (Flow)

### การบันทึกข้อมูล (Save)

```
Frontend (StationAccessory.tsx)
  ↓
1. บันทึกลง localStorage (ev_calculator_form_data, ev_station_accessory_form_data)
  ↓
2. สร้าง combinedData object
  ↓
3. POST /api/save-data
  ↓
Backend (server/index.js)
  ↓
4. ตรวจสอบว่ามี customer_code อยู่แล้วหรือไม่
  ↓
5a. ถ้ามี → UPDATE customer_data
5b. ถ้าไม่มี → INSERT INTO customer_data
  ↓
6. Commit และ return success
```

### การโหลดข้อมูล (Load)

```
Frontend (StationAccessory.tsx)
  ↓
1. GET /api/load-data/<customer_code>
  ↓
Backend (server/index.js)
  ↓
2. SELECT data FROM customer_data WHERE customer_code = ?
  ↓
3. Return JSON response
  ↓
Frontend
  ↓
4. โหลดข้อมูลเข้า state
  ↓
5. บันทึกลง localStorage (สำหรับ offline use)
```

---

## 📝 รายละเอียด API Endpoints

### 1. POST /api/save-data

**Request Body:**
```json
{
  "customerCode": "CUST001",
  "home": { ... },
  "stationAccessory": { ... },
  "savedAt": "2024-01-01T00:00:00",
  "lastUpdated": "home" | "station-accessory"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Data saved successfully",
  "customerCode": "CUST001",
  "savedAt": "2024-01-01T00:00:00"
}
```

### 2. GET /api/load-data/<customer_code>

**Response:**
```json
{
  "success": true,
  "data": {
    "customerCode": "CUST001",
    "home": { ... },
    "stationAccessory": { ... },
    ...
  }
}
```

### 3. GET /api/list-customers

**Response:**
```json
{
  "success": true,
  "customers": ["CUST001", "CUST002", ...]
}
```

### 4. GET /api/health

**Response:**
```json
{
  "status": "ok",
  "message": "API is running",
  "database": "connected"
}
```

---

## 🔍 ตรวจสอบว่าครบถ้วนหรือไม่

### ✅ สิ่งที่มีแล้ว (Complete)

1. **Database Schema**
   - SQL schema พร้อมใช้
   - DBML schema สำหรับ visualization
   - มี indexes และ triggers

2. **Backend API**
   - มี endpoints ครบถ้วน
   - รองรับ INSERT และ UPDATE
   - มี error handling
   - ใช้ connection pooling

3. **Frontend Integration**
   - มีการบันทึกข้อมูลไปยัง API
   - มีการโหลดข้อมูลจาก API
   - มี fallback ไปยัง localStorage

4. **Migration Script**
   - Script สำหรับย้ายข้อมูลจาก JSON files
   - มี error handling
   - มี progress reporting

### ⚠️ สิ่งที่ต้องทำเพิ่ม (To Do)

1. **สร้างไฟล์ `.env`**
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ev_station_db
   DB_USER=postgres
   DB_PASSWORD=your_password_here
   DATABASE_URL="postgresql://postgres:your_password_here@localhost:5432/ev_station_db?schema=public"
   ```

2. **ติดตั้ง Dependencies**
   ```bash
   npm install
   ```

3. **สร้างฐานข้อมูล**
   - เปิด DBeaver
   - สร้างฐานข้อมูล `ev_station_db`
   - รัน `database/schema.sql` ใน SQL Editor

4. **ย้ายข้อมูลเดิม (ถ้ามี)**
   ```bash
   python database/migrate_from_json.py
   ```
   - ต้องมี Python 3 และติดตั้ง `psycopg2-binary`, `python-dotenv`

5. **ทดสอบการทำงาน**
   ```bash
   npm run api
   ```
   - ตรวจสอบ: http://localhost:8000/api/health
   - ทดสอบบันทึกข้อมูลจาก frontend
   - ทดสอบโหลดข้อมูลจาก frontend

---

## 🎯 สรุป

### ✅ ครบถ้วนแล้ว:
- Database schema (SQL + DBML)
- Backend API (พร้อมใช้งาน)
- Frontend integration (มีการเรียกใช้ API)
- Migration script
- Dependencies ใน requirements.txt

### ⚠️ ต้องทำเพิ่ม:
- สร้างไฟล์ `.env` และตั้งค่า database connection
- สร้างฐานข้อมูล PostgreSQL
- รัน schema.sql เพื่อสร้างตาราง
- ย้ายข้อมูลเดิม (ถ้ามี)
- ทดสอบการทำงาน

---

## 📚 เอกสารอ้างอิง

- `POSTGRESQL_SETUP.md` - คู่มือการติดตั้งและใช้งาน PostgreSQL
- `QUICK_START.md` - คู่มือเริ่มต้นแบบรวดเร็ว
- `database/schema.sql` - SQL schema
- `database/schema.dbml` - DBML schema
- `database/migrate_from_json.py` - Migration script

