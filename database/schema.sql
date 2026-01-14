-- PostgreSQL Database Schema for EV Station Calculator
-- สร้างฐานข้อมูลและตารางสำหรับเก็บข้อมูล

-- สร้างฐานข้อมูล (ถ้ายังไม่มี)
-- หมายเหตุ: คำสั่งนี้ต้องรันในฐานข้อมูล postgres ก่อน
-- CREATE DATABASE ev_station_db;

-- เชื่อมต่อกับฐานข้อมูล ev_station_db ก่อนรันคำสั่งด้านล่าง
-- \c ev_station_db;

-- ตารางสำหรับเก็บข้อมูลหลักของลูกค้า
CREATE TABLE IF NOT EXISTS customer_data (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(255) UNIQUE NOT NULL,
    data JSONB NOT NULL,  -- เก็บข้อมูลทั้งหมดเป็น JSON
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง index เพื่อเพิ่มความเร็วในการค้นหา
CREATE INDEX IF NOT EXISTS idx_customer_code ON customer_data(customer_code);
CREATE INDEX IF NOT EXISTS idx_last_updated ON customer_data(last_updated DESC);

-- ตารางสำหรับเก็บประวัติการบันทึก (History)
-- หมายเหตุ: ตารางนี้พร้อมใช้งานสำหรับการบันทึกประวัติในอนาคต
CREATE TABLE IF NOT EXISTS customer_history (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง index สำหรับประวัติ
CREATE INDEX IF NOT EXISTS idx_history_customer_code ON customer_history(customer_code);
CREATE INDEX IF NOT EXISTS idx_history_saved_at ON customer_history(saved_at DESC);

-- ฟังก์ชันสำหรับอัพเดท last_updated อัตโนมัติ
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger เพื่ออัพเดท last_updated อัตโนมัติ
CREATE TRIGGER update_customer_data_timestamp
    BEFORE UPDATE ON customer_data
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated();

-- หมายเหตุเพิ่มเติม:
-- JSONB เป็นประเภทข้อมูลที่เหมาะสมสำหรับเก็บข้อมูล JSON ที่มีโครงสร้างยืดหยุ่น
-- JSONB รองรับการ query และ index ได้ดีกว่า JSON

