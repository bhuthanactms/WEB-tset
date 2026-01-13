from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # อนุญาตให้ frontend เรียกใช้ API ได้

# สร้างโฟลเดอร์สำหรับเก็บข้อมูล
DATA_DIR = 'saved_data'
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

@app.route('/api/save-data', methods=['POST'])
def save_data():
    """บันทึกข้อมูลลงในไฟล์บนเซิร์ฟเวอร์"""
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
        
        # บันทึกข้อมูลลงไฟล์โดยใช้ customer_code เป็นชื่อไฟล์
        filename = f"{customer_code}.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        # อ่านข้อมูลเดิม (ถ้ามี) และอัพเดท
        existing_data = {}
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
            except:
                pass
        
        # รวมข้อมูลเดิมกับข้อมูลใหม่ (ข้อมูลใหม่จะทับข้อมูลเดิม)
        updated_data = {**existing_data, **data}
        
        # บันทึกไฟล์
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(updated_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'success': True,
            'message': 'Data saved successfully',
            'customerCode': customer_code,
            'savedAt': data['savedAt']
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/load-data/<customer_code>', methods=['GET'])
def load_data(customer_code):
    """โหลดข้อมูลจากเซิร์ฟเวอร์"""
    try:
        if not customer_code:
            return jsonify({'success': False, 'error': 'Customer code is required'}), 400
        
        filename = f"{customer_code}.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': 'Data not found'}), 404
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return jsonify({
            'success': True,
            'data': data
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/list-customers', methods=['GET'])
def list_customers():
    """รายการรหัสลูกค้าทั้งหมดที่มีข้อมูลบันทึกไว้"""
    try:
        if not os.path.exists(DATA_DIR):
            return jsonify({'success': True, 'customers': []}), 200
        
        files = [f.replace('.json', '') for f in os.listdir(DATA_DIR) if f.endswith('.json')]
        
        return jsonify({
            'success': True,
            'customers': files
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """ตรวจสอบสถานะ API"""
    return jsonify({'status': 'ok', 'message': 'API is running'}), 200

if __name__ == '__main__':
    # รองรับการกำหนด port จาก environment variable หรือใช้ 8000 เป็นค่า default
    port = int(os.environ.get('PORT', 8000))
    app.run(debug=True, host='0.0.0.0', port=port)
