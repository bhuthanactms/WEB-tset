# 🚀 คู่มือเริ่มต้นใช้งาน PostgreSQL - แบบรวดเร็ว

คู่มือนี้จะช่วยให้คุณเปลี่ยนจาก JSON files ไปใช้ PostgreSQL ได้ภายใน 5 นาที

## 📝 ขั้นตอนที่ 1: สร้างฐานข้อมูล (2 นาที)

1. เปิด **pgAdmin 4**
2. คลิกขวาที่ **Databases** → **Create** → **Database...**
3. ตั้งชื่อ: `ev_station_db`
4. คลิก **Save**

## 📝 ขั้นตอนที่ 2: สร้างตาราง (1 นาที)

1. ใน pgAdmin 4: คลิกขวาที่ฐานข้อมูล `ev_station_db` → **Query Tool**
2. เปิดไฟล์ `database/schema.sql` ด้วยโปรแกรม Text Editor (เช่น Notepad++)
3. **คัดลอกเนื้อหาทั้งหมด** (ยกเว้นบรรทัดที่มี `CREATE DATABASE` และ `\c`)
4. **วางใน Query Tool**
5. กด **F5** หรือคลิกปุ่ม **Execute (▶)**
6. ควรเห็น "Query returned successfully" ✅

## 📝 ขั้นตอนที่ 3: ตั้งค่าเชื่อมต่อ (1 นาที)

1. สร้างไฟล์ `.env` ในโฟลเดอร์โปรเจกต์ (คัดลอกจาก `env.example`)
2. เปิดไฟล์ `.env` และแก้ไข:
   ```env
   DB_PASSWORD=your_postgres_password_here
   ```
   (แทนที่ `your_postgres_password_here` ด้วยรหัสผ่านที่ตั้งตอนติดตั้ง PostgreSQL)

## 📝 ขั้นตอนที่ 4: ย้ายข้อมูล (1 นาที - ถ้ามีข้อมูลเดิม)

ถ้ามีไฟล์ JSON ในโฟลเดอร์ `saved_data/`:

```bash
python database/migrate_from_json.py
```

## 📝 ขั้นตอนที่ 5: เริ่มใช้งาน

```bash
python app.py
```

เปิดเบราว์เซอร์ไปที่: `http://localhost:8000/api/health`

ควรเห็น:
```json
{
  "status": "ok",
  "message": "API is running",
  "database": "connected"
}
```

---

## ✅ เสร็จแล้ว!

ตอนนี้ระบบใช้ PostgreSQL แล้ว 🎉

สำหรับข้อมูลเพิ่มเติม ดู `POSTGRESQL_SETUP.md`

