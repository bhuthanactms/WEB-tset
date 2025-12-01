// Default fallback data
const defaultJsonData = {
    "header": {
        "prefix": "____",
        "data1": "________________",
        "data2": "________________",
        "data3": "________________",
        "data4": "________________"
    },
    "tables": [
        {
            "tablename": "1.ระบบแรงสูง",
            "type": "default",
            "rows": []
        },
        {
            "tablename": "2.ระบบแรงต่ำ",
            "type": "default",
            "rows": []
        },
        {
            "tablename": "3.อุปกรณ์ และ เงื่อนไขเพิ่มเติม",
            "type": "default",
            "rows": []
        },
        {
            "tablename": "4.สรุปต้นทุน",
            "type": "cost",
            "rows": {
                "part_price": 0,
                "wage_price": 0
            }
        },
        {
            "tablename": "5.ค่าเดินทาง",
            "type": "distance",
            "rows": []
        }
    ],
    "summary": {
        "workers": 0,
        "work_days": 0,
        "total_labor": 0,
        "trucks": 0,
        "truck_days": 0,
        "total_truck_trips": 0,
        "cars": 0,
        "car_days": 0,
        "total_car_trips": 0,
        "hiab": 0,
        "hiab_days": 0,
        "total_hiab_trips": 0,
        "total_cost": "0",
        "travel_cost": "0",
        "profit": 0,
        "profit_amount": "0",
        "cost_and_profit": "0",
        "commission": 0,
        "commission_amount": "0"
    }
};

// Function to get JSON data from StationAccessory or return default
export function getJsonData() {
    // Try to get data from StationAccessory component
    if (typeof window !== 'undefined' && window.getStationPDFData) {
        try {
            const data = window.getStationPDFData();
            if (data) {
                return data;
            }
        } catch (error) {
            console.error('Error getting PDF data from StationAccessory:', error);
        }
    }

    // Return default data if StationAccessory data is not available
    return defaultJsonData;
}

// Export default data for backward compatibility
export const json_data = getJsonData();
