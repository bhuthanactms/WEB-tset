export const json_data =
{
    "header": {
        "prefix": "1.1",
        "data1": "โครงการติดตั้งระบบไฟฟ้า",
        "data2": "กรุงเทพฯ",
        "data3": "คุณสมชาย ใจดี",
        "data4": "30 พ.ย. 2568"
    },
    "tables": [
        {
            "tablename": "1.ระบบแรงสูง",
            "type": "default",
            "rows": [
                {
                    "code": "M001",
                    "type": "วัสดุ",
                    "name": "สายไฟ THW 2.5 sq.mm",
                    "amount": 500,
                    "range": 1,
                    "parts_total": 25000,
                    "wage_total": 15000,
                    "total": 40000
                },
                {
                    "code": "M002",
                    "type": "อุปกรณ์",
                    "name": "เบรกเกอร์ 32A",
                    "amount": 15,
                    "range": 1,
                    "parts_total": 9000,
                    "wage_total": 3000,
                    "total": 12000
                }
            ]
        },
        {
            "tablename": "2.ระบบแรงต่ำ",
            "type": "default",
            "rows": [
                {
                    "code": "M001",
                    "type": "วัสดุ",
                    "name": "สายไฟ THW 2.5 sq.mm",
                    "amount": 500,
                    "range": 1,
                    "parts_total": 25000,
                    "wage_total": 15000,
                    "total": 40000
                },
                {
                    "code": "M002",
                    "type": "อุปกรณ์",
                    "name": "เบรกเกอร์ 32A",
                    "amount": 15,
                    "range": 1,
                    "parts_total": 9000,
                    "wage_total": 3000,
                    "total": 12000
                }
            ]
        },
        {
            "tablename": "3.อุปกรณ์ และ เงื่อนไขเพิ่มเติม",
            "type": "default",
            "rows": [
                {
                    "code": "M001",
                    "type": "วัสดุ",
                    "name": "สายไฟ THW 2.5 sq.mm",
                    "amount": 500,
                    "range": 1,
                    "parts_total": 25000,
                    "wage_total": 15000,
                    "total": 40000
                },
                {
                    "code": "M002",
                    "type": "อุปกรณ์",
                    "name": "เบรกเกอร์ 32A",
                    "amount": 15,
                    "range": 1,
                    "parts_total": 9000,
                    "wage_total": 3000,
                    "total": 12000
                }
            ]
        },
        {
            "tablename": "4.สรุปต้นทุน",
            "type": "cost",
            "rows": {
                "part_price": 34000,
                "wage_price": 18000
            }
        },
        {
            "tablename": "5.ค่าเดินทาง",
            "type": "distance",
            "rows": [
                {
                    "distance": "0-50 กม.",
                    "travel_cost": 1000,
                    "travel_between_accommodation": 500,
                    "accommodation_food": 2000,
                    "wage": 3000,
                    "total": 6500
                },
                {
                    "distance": "51-100 กม.",
                    "travel_cost": 2000,
                    "travel_between_accommodation": 1000,
                    "accommodation_food": 3000,
                    "wage": 4000,
                    "total": 10000
                }
            ]
        }
    ],
    "summary": {
        "workers": 10,
        "work_days": 5,
        "total_labor": 50,
        "trucks": 2,
        "truck_days": 3,
        "total_truck_trips": 6,
        "cars": 1,
        "car_days": 5,
        "total_car_trips": 5,
        "hiab": 1,
        "hiab_days": 2,
        "total_hiab_trips": 2,
        "total_cost": "52,000",
        "travel_cost": "16,500",
        "profit": 15,
        "profit_amount": "7,800",
        "cost_and_profit": "59,800",
        "commission": 5,
        "commission_amount": "2,990"
    }
}
