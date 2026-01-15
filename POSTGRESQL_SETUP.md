# คู่มือการติดตั้งและใช้งาน PostgreSQL สำหรับ EV Station Calculator

คู่มือฉบับนี้จะช่วยให้คุณเปลี่ยนจากระบบบันทึกข้อมูลด้วย JSON files ไปใช้ PostgreSQL database แทน

---

## 📋 สารบัญ

1. [ความต้องการของระบบ](#ความต้องการของระบบ)
2. [การติดตั้ง PostgreSQL](#การติดตั้ง-postgresql)
3. [การสร้างฐานข้อมูล](#การสร้างฐานข้อมูล)
4. [การตั้งค่าโปรเจกต์](#การตั้งค่าโปรเจกต์)
5. [การย้ายข้อมูลจาก JSON files](#การย้ายข้อมูลจาก-json-files)
6. [การทดสอบการทำงาน](#การทดสอบการทำงาน)
7. [การแก้ไขปัญหา](#การแก้ไขปัญหา)

---

## 🎯 ความต้องการของระบบ

- PostgreSQL 14 หรือใหม่กว่า (ติดตั้งแบบ local)
- Node.js 18+ (สำหรับ Express/Prisma)
- DBeaver (สำหรับจัดการฐานข้อมูล)

---

## 📦 การติดตั้ง PostgreSQL

### ขั้นตอนที่ 1: ดาวน์โหลดและติดตั้ง PostgreSQL

1. ไปที่ [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. ดาวน์โหลด PostgreSQL installer
3. รัน installer และทำตามขั้นตอน:
   - เลือก "PostgreSQL Server"
   - ตั้งค่า **รหัสผ่านสำหรับ superuser (postgres)** - **จำรหัสผ่านนี้ไว้!**
   - เลือก port 5432 (ค่า default)
   - เลือก locale เป็น "C" หรือ "Thai, Thailand"

### ขั้นตอนที่ 2: ตรวจสอบการติดตั้งด้วย DBeaver

1. เปิด DBeaver
2. New Database Connection → เลือก PostgreSQL
3. ใส่ Host/Port/Database/User/Password
4. กด Test Connection ถ้าผ่านถือว่าพร้อมใช้งาน ✅

---

## 🗄️ การสร้างฐานข้อมูล

### วิธีที่ 1: ใช้ DBeaver (แนะนำ)

1. เปิด DBeaver
2. คลิกขวาที่ connection → SQL Editor
3. รันคำสั่ง:
   ```sql
   CREATE DATABASE ev_station_db;
   ```
4. Refresh แล้วเห็นฐานข้อมูล `ev_station_db` ถือว่าสำเร็จ ✅

### วิธีที่ 2: ใช้ Command Line (psql)

1. เปิด Command Prompt หรือ PowerShell
2. ไปที่โฟลเดอร์ที่ติดตั้ง PostgreSQL (ปกติคือ `C:\Program Files\PostgreSQL\<version>\bin`)
3. หรือใช้ DBeaver SQL Editor:
   - เลือกฐานข้อมูล "postgres" แล้วเปิด SQL Editor
   - พิมพ์คำสั่ง: `CREATE DATABASE ev_station_db;`
   - กด Execute

---

## ⚙️ การตั้งค่าโปรเจกต์

### ขั้นตอนที่ 1: ติดตั้ง Node Dependencies

```bash
npm install
```

### ขั้นตอนที่ 2: สร้างไฟล์ .env

1. คัดลอกไฟล์ `env.example` เป็น `.env`:
   ```bash
   copy env.example .env
   ```
   
   หรือสร้างไฟล์ `.env` ใหม่ในโฟลเดอร์โปรเจกต์

2. เปิดไฟล์ `.env` และแก้ไขข้อมูลดังนี้:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ev_station_db
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password_here
   ```
   
   **สำคัญ**: แทนที่ `your_postgres_password_here` ด้วยรหัสผ่าน PostgreSQL ที่คุณตั้งไว้

### ขั้นตอนที่ 3: สร้างตารางในฐานข้อมูล

มี 2 วิธี:

#### วิธีที่ 1: ใช้ DBeaver (แนะนำ)

1. เปิด DBeaver → เลือกฐานข้อมูล `ev_station_db`
2. คลิกขวา → SQL Editor
3. เปิดไฟล์ `database/schema.sql`
4. คัดลอกเนื้อหาทั้งหมด (ยกเว้นส่วน CREATE DATABASE และคำสั่งที่เกี่ยวกับ \c)
5. วางใน SQL Editor
6. กด Execute (▶)
7. ตรวจสอบว่าตารางถูกสร้างสำเร็จ

#### วิธีที่ 2: ใช้ psql Command Line

```bash
psql -U postgres -d ev_station_db -f database/schema.sql
```

**หมายเหตุ**: ต้องลบส่วน CREATE DATABASE ออกจาก schema.sql ก่อน หรือรันแค่ส่วน CREATE TABLE

### ขั้นตอนที่ 4: ตรวจสอบตาราง

1. ใน DBeaver: ขยาย ev_station_db → Schemas → public → Tables
2. ควรเห็นตาราง:
   - `customer_data`
   - `customer_history`

---

## 📦 การย้ายข้อมูลจาก JSON files

### ขั้นตอนที่ 1: ตรวจสอบข้อมูลเดิม

ตรวจสอบว่ามีไฟล์ JSON ในโฟลเดอร์ `saved_data/` หรือไม่

### ขั้นตอนที่ 2: รัน Migration Script

```bash
python database/migrate_from_json.py
```

Script จะ:
- อ่านไฟล์ JSON ทั้งหมดจากโฟลเดอร์ `saved_data/`
- ย้ายข้อมูลไปยังฐานข้อมูล PostgreSQL
- แสดงสรุปผลการย้ายข้อมูล

### ขั้นตอนที่ 3: ตรวจสอบข้อมูล

1. เปิด DBeaver
2. ไปที่ ev_station_db → Schemas → public → Tables → customer_data
3. คลิกขวาที่ `customer_data` → View/Edit Data → All Rows
4. ตรวจสอบว่ามีข้อมูลถูกย้ายมาหรือไม่

---

## 🧪 การทดสอบการทำงาน

### ขั้นตอนที่ 1: เริ่ม Express API Server

```bash
npm run api
```

คุณควรเห็นข้อความ:
```
API server running on http://0.0.0.0:8000
```

### ขั้นตอนที่ 2: ทดสอบ API

เปิดเบราว์เซอร์และไปที่:
```
http://localhost:8000/api/health
```

ควรเห็น JSON response:
```json
{
  "status": "ok",
  "message": "API is running",
  "database": "connected"
}
```

### ขั้นตอนที่ 3: ทดสอบจาก Frontend

1. เปิดเว็บแอปพลิเคชัน
2. ลองบันทึกข้อมูล
3. ตรวจสอบว่าไม่มี error ใน console
4. ตรวจสอบข้อมูลในฐานข้อมูลผ่าน DBeaver

---

## 🔧 การแก้ไขปัญหา

### ปัญหา: "Database connection error"

**สาเหตุที่เป็นไปได้:**
- PostgreSQL ไม่ทำงาน
- รหัสผ่านผิด
- ฐานข้อมูลยังไม่ถูกสร้าง

**วิธีแก้ไข:**
1. ตรวจสอบว่า PostgreSQL service ทำงานอยู่:
   - เปิด Services (Win + R → services.msc)
   - หา "postgresql-x64-<version>"
   - ตรวจสอบว่า Status เป็น "Running"

2. ตรวจสอบรหัสผ่านในไฟล์ `.env`

3. ตรวจสอบว่าฐานข้อมูล `ev_station_db` สร้างแล้วหรือยัง

### ปัญหา: "relation 'customer_data' does not exist"

**สาเหตุ:** ยังไม่ได้สร้างตาราง

**วิธีแก้ไข:**
- รันคำสั่ง SQL ใน `database/schema.sql` ผ่าน DBeaver SQL Editor

### ปัญหา: "Prisma client not generated"

**วิธีแก้ไข:**
```bash
npm run prisma:generate
```

### ปัญหา: Migration script ไม่ทำงาน

**วิธีแก้ไข:**
1. ตรวจสอบว่าไฟล์ `.env` ตั้งค่าถูกต้อง
2. ตรวจสอบว่า PostgreSQL ทำงานอยู่
3. ตรวจสอบว่า Prisma `DATABASE_URL` ถูกต้อง
4. ลองรัน `npm run prisma:migrate` หรือ `npm run prisma:db-push` อีกครั้ง

---

## 📝 หมายเหตุสำคัญ

1. **Backup ข้อมูล**: ก่อนย้ายข้อมูล แนะนำให้สำรองโฟลเดอร์ `saved_data/` ไว้ก่อน

2. **รหัสผ่าน**: เก็บไฟล์ `.env` ไว้เป็นความลับ และอย่า commit ลง git

3. **Performance**: PostgreSQL จะทำงานเร็วกว่า JSON files เมื่อมีข้อมูลมาก

4. **การสำรองข้อมูล**: ใช้ DBeaver เพื่อ backup ฐานข้อมูล:
   - คลิกขวาที่ ev_station_db → Tools → Backup
   - เลือกโฟลเดอร์ที่ต้องการ
   - คลิก Start

---

## 📚 ข้อมูลเพิ่มเติม

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [DBeaver Documentation](https://dbeaver.io/docs/)
- [psycopg2 Documentation](https://www.psycopg.org/docs/)

---

## ✅ Checklist การติดตั้ง

- [ ] ติดตั้ง PostgreSQL สำเร็จ
- [ ] สร้างฐานข้อมูล `ev_station_db`
- [ ] สร้างไฟล์ `.env` และตั้งค่าถูกต้อง
- [ ] สร้างตารางด้วย `database/schema.sql`
- [ ] ติดตั้ง Python dependencies
- [ ] ย้ายข้อมูลจาก JSON files (ถ้ามี)
- [ ] ทดสอบการทำงานของ API
- [ ] ทดสอบจาก Frontend

---

**หากมีปัญหาหรือคำถามเพิ่มเติม กรุณาตรวจสอบส่วน "การแก้ไขปัญหา" หรืออ้างอิงจากเอกสาร PostgreSQL**

