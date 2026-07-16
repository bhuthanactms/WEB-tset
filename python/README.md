# BOM Cost Sheet Generator

Generate ใบถอดต้นทุน EV Charging Station เป็น `.xlsx` + `.pdf` พร้อมพิมพ์ A4

## Dependencies

```bash
pip install openpyxl Pillow
# สำหรับแปลง PDF (Linux/Mac):
# sudo apt install libreoffice poppler-utils
```

## Usage

```bash
# จาก JSON file
python generate_bom.py example_input.json -o ./output

# จาก stdin (web backend)
echo '{"doc_no":"PP001",...}' | python generate_bom.py - -o /tmp/output

# สร้างแค่ xlsx (ไม่ต้องมี LibreOffice)
python generate_bom.py example_input.json -o ./output --xlsx-only
```

## Input JSON Schema

```json
{
  "doc_no":       "PP69001",
  "project_name": "ใบถอดต้นทุน EV CHARGING STATION",
  "company":      "MPJ LOGISTIC",
  "location":     "ศรีราชา ชลบุรี",
  "salesperson":  "Sittipong",
  "date":         "15 ก.ค. 2569",
  "charger": {
    "name": "Group Charger: 720 kW",
    "qty":  "1 เครื่อง"
  },
  "sections": [
    {
      "title": "1. ระบบแรงสูง (High Voltage System)",
      "style": "extra",   // optional: force extra-items font (5/6pt)
      "items": [
        {
          "code":     "7.3.11",
          "type":     "หม้อแปลง 22 kV",
          "name":     "1000 kVA",
          "qty":      "1",
          "distance": ""
        }
      ]
    }
  ],
  "note": "หมายเหตุ: ..."
}
```

**หมายเหตุ:**
- Section สุดท้ายใน `sections[]` จะ apply ฟอนต์ขนาดเล็ก (header 5pt / body 6pt) อัตโนมัติ  
  หรือกำหนด `"style": "extra"` ต่อ section ที่ต้องการ
- แถวที่ `code == "-"` จะแสดงเป็นตัวเอียงสีเทา (รายการย่อย/หมายเหตุ)

## Output

```json
{
  "xlsx":     "/abs/path/output.xlsx",
  "pdf":      "/abs/path/output.pdf",
  "pages":    1,
  "overlaps": 0
}
```

- `overlaps` ต้องเป็น **0** จึงจะ pass QA

## Python API

```python
from generate_bom import generate, generate_xlsx_only

# Full pipeline (xlsx + pdf + QA)
result = generate(data_dict, output_dir="./output")

# xlsx only
generate_xlsx_only(data_dict, "./output/report.xlsx")
```

## Font requirement (Linux)

```bash
fc-list :lang=th        # เช็คฟอนต์ภาษาไทยที่มี
# ถ้าไม่มี Loma:
sudo apt install fonts-tlwg-loma
```

แก้ `FONT_PATH` ใน `generate_bom.py` ให้ตรงกับ path จริงบนเซิร์ฟเวอร์
