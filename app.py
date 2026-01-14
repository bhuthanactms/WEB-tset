from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from dotenv import load_dotenv

# โหลด environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # อนุญาตให้ frontend เรียกใช้ API ได้

# การตั้งค่าฐานข้อมูล PostgreSQL
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'ev_station_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '')
}

# สร้าง connection pool สำหรับประสิทธิภาพที่ดีขึ้น
connection_pool = None

def get_db_connection():
    """สร้างการเชื่อมต่อฐานข้อมูล"""
    global connection_pool
    try:
        if connection_pool is None:
            connection_pool = SimpleConnectionPool(1, 20, **DB_CONFIG)
        return connection_pool.getconn()
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        raise

def return_db_connection(conn):
    """คืน connection กลับไปที่ pool"""
    global connection_pool
    if connection_pool:
        connection_pool.putconn(conn)

def init_db():
    """ตรวจสอบว่าตารางถูกสร้างแล้วหรือยัง"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # ตรวจสอบว่าตาราง customer_data มีอยู่หรือไม่
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'customer_data'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        cursor.close()
        return_db_connection(conn)
        
        if table_exists:
            print("✅ Database tables found")
        else:
            print("⚠️ Database tables not found. Please run database/schema.sql through pgAdmin 4 first.")
            print("   See POSTGRESQL_SETUP.md for instructions.")
        
    except Exception as e:
        print(f"⚠️ Database check warning: {e}")
        print("   Please ensure PostgreSQL is running and database connection is configured correctly.")

@app.route('/api/save-data', methods=['POST'])
def save_data():
    """บันทึกข้อมูลลงใน PostgreSQL"""
    conn = None
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        customer_code = data.get('customerCode', '')
        if not customer_code:
            return jsonify({'success': False, 'error': 'Customer code is required'}), 400
        
        # เพิ่ม timestamp
        data['savedAt'] = datetime.now().isoformat()
        data['lastUpdated'] = datetime.now().isoformat()
        
        # เชื่อมต่อฐานข้อมูล
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
        cursor.execute(
            "SELECT id, data FROM customer_data WHERE customer_code = %s",
            (customer_code,)
        )
        existing = cursor.fetchone()
        
        if existing:
            # อัพเดทข้อมูลเดิม
            existing_data = existing['data']
            # รวมข้อมูลเดิมกับข้อมูลใหม่ (ข้อมูลใหม่จะทับข้อมูลเดิม)
            updated_data = {**existing_data, **data}
            
            cursor.execute(
                """UPDATE customer_data 
                   SET data = %s, last_updated = CURRENT_TIMESTAMP 
                   WHERE customer_code = %s 
                   RETURNING id, saved_at, last_updated""",
                (json.dumps(updated_data, ensure_ascii=False), customer_code)
            )
            result = cursor.fetchone()
        else:
            # สร้างข้อมูลใหม่
            cursor.execute(
                """INSERT INTO customer_data (customer_code, data) 
                   VALUES (%s, %s) 
                   RETURNING id, saved_at, last_updated""",
                (customer_code, json.dumps(data, ensure_ascii=False))
            )
            result = cursor.fetchone()
        
        conn.commit()
        cursor.close()
        return_db_connection(conn)
        
        return jsonify({
            'success': True,
            'message': 'Data saved successfully',
            'customerCode': customer_code,
            'savedAt': data['savedAt']
        }), 200
        
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
            return_db_connection(conn)
        print(f"❌ Database error: {e}")
        return jsonify({'success': False, 'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        if conn:
            conn.rollback()
            return_db_connection(conn)
        print(f"❌ Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/load-data/<customer_code>', methods=['GET'])
def load_data(customer_code):
    """โหลดข้อมูลจาก PostgreSQL"""
    conn = None
    try:
        if not customer_code:
            return jsonify({'success': False, 'error': 'Customer code is required'}), 400
        
        # เชื่อมต่อฐานข้อมูล
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute(
            "SELECT data FROM customer_data WHERE customer_code = %s",
            (customer_code,)
        )
        result = cursor.fetchone()
        
        cursor.close()
        return_db_connection(conn)
        
        if not result:
            return jsonify({'success': False, 'error': 'Data not found'}), 404
        
        # PostgreSQL จะคืน JSONB เป็น dict อัตโนมัติ
        data = result['data']
        
        return jsonify({
            'success': True,
            'data': data
        }), 200
        
    except psycopg2.Error as e:
        if conn:
            return_db_connection(conn)
        print(f"❌ Database error: {e}")
        return jsonify({'success': False, 'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        if conn:
            return_db_connection(conn)
        print(f"❌ Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/list-customers', methods=['GET'])
def list_customers():
    """รายการรหัสลูกค้าทั้งหมดที่มีข้อมูลบันทึกไว้"""
    conn = None
    try:
        # เชื่อมต่อฐานข้อมูล
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT customer_code FROM customer_data ORDER BY last_updated DESC")
        results = cursor.fetchall()
        
        customers = [row[0] for row in results]
        
        cursor.close()
        return_db_connection(conn)
        
        return jsonify({
            'success': True,
            'customers': customers
        }), 200
        
    except psycopg2.Error as e:
        if conn:
            return_db_connection(conn)
        print(f"❌ Database error: {e}")
        return jsonify({'success': False, 'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        if conn:
            return_db_connection(conn)
        print(f"❌ Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """ตรวจสอบสถานะ API และการเชื่อมต่อฐานข้อมูล"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        return_db_connection(conn)
        
        return jsonify({
            'status': 'ok', 
            'message': 'API is running',
            'database': 'connected'
        }), 200
    except Exception as e:
        if conn:
            return_db_connection(conn)
        return jsonify({
            'status': 'error',
            'message': 'Database connection failed',
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # ตรวจสอบและสร้างตารางเมื่อเริ่มต้น
    try:
        init_db()
    except Exception as e:
        print(f"⚠️ Warning: Could not initialize database: {e}")
        print("Please make sure PostgreSQL is running and the database exists")
    
    # รองรับการกำหนด port จาก environment variable หรือใช้ 8000 เป็นค่า default
    port = int(os.environ.get('PORT', 8000))
    app.run(debug=True, host='0.0.0.0', port=port)
