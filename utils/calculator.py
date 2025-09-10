"""
Cooling calculation logic for the FES Evaporative Cooling Calculator.
Handles all the mathematical operations for cooling requirements.
"""

def calculate_water_consumption(temp, humidity, airflow):
    """
    Calculate water consumption based on outdoor temperature, relative humidity and airflow.
    The table values are in L per 1000 m³/h.
    """
    water_table = {
        35: {15: 6.59, 20: 6.08, 25: 5.58, 30: 5.12, 35: 4.67, 40: 4.23, 45: 3.82, 50: 3.41, 55: 3.02, 60: 2.62, 65: 2.26, 70: 1.92},
        40: {15: 7.29, 20: 6.69, 25: 6.14, 30: 5.61, 35: 5.10, 40: 4.61, 45: 4.16, 50: 3.70, 55: 3.29, 60: 2.86, 65: 2.47, 70: 2.09},
        45: {15: 7.98, 20: 7.31, 25: 6.68, 30: 6.10, 35: 5.53, 40: 5.00, 45: 4.48, 50: 4.00, 55: 3.53, 60: 3.09, 65: 2.65, 70: 2.24}
    }
    
    # Choose closest table keys
    temp_key = temp <= 35 and 35 or (temp <= 40 and 40 or 45)
    humidity_key = round(humidity / 5) * 5
    clamped_humidity = max(15, min(70, humidity_key))
    
    water_per_unit = water_table.get(temp_key, {}).get(clamped_humidity, 4.5)
    return (airflow / 1000) * water_per_unit  # L/h

def calculate_cooling(data):
    """
    Core evaporative cooling calculation.
    Computes required airflow, cooling load, water consumption, power/CO₂/cost savings.
    """
    area = data.get("area", 0)
    height = data.get("height", 3)
    people = data.get("people", 0)
    application_area = data.get("application_area", "")
    outdoor_temp = data.get("outdoor_temp", 35)
    humidity = data.get("humidity", 40)
    manual_air_changes = data.get("manual_air_changes", False)
    custom_air_changes = data.get("custom_air_changes", 15)
    
    # Application areas with air change rates (ACH)
    application_areas = {
        "plastic_injection": {"name": "Plastic Injection", "airChanges": 35},
        "polyester_production": {"name": "Polyester Bag & Film Production", "airChanges": 40},
        "plastic_extrusion": {"name": "Plastic Extrusion", "airChanges": 30},
        "plastic_labels": {"name": "Plastic Labels and Printing Films", "airChanges": 35},
        "rubber_calendering": {"name": "Rubber Calendering", "airChanges": 40},
        "rubber_vulcanization": {"name": "Rubber Vulcanization", "airChanges": 40},
        "rubber_extrusion": {"name": "Rubber Extrusion and Grinding", "airChanges": 40},
        "metal_casting": {"name": "Metal Casting", "airChanges": 40},
        "metal_processing": {"name": "Metal Processing, Milling, Pressing", "airChanges": 25},
        "metal_welding": {"name": "Metal Welding", "airChanges": 35},
        "metal_forming": {"name": "Metal Forming", "airChanges": 35},
        "metal_spraying": {"name": "Metal Spraying", "airChanges": 35},
        "garment_cutting": {"name": "Garment Cutting, Sewing", "airChanges": 30},
        "garment_ironing": {"name": "Garment Ironing", "airChanges": 40},
        "laundry": {"name": "Laundry", "airChanges": 12},
        "food_production": {"name": "Food Production", "airChanges": 40},
        "food_sterilization": {"name": "Food Sterilization", "airChanges": 40},
        "food_packaging": {"name": "Food Packaging, Canning", "airChanges": 30},
        "kitchens": {"name": "Kitchens", "airChanges": 20},
        "restaurants": {"name": "Restaurants", "airChanges": 12},
        "bakeries": {"name": "Bakeries", "airChanges": 20},
        "canteen": {"name": "Canteen & Cafeteria", "airChanges": 27},
        "gymnasiums": {"name": "Gymnasiums", "airChanges": 12},
        "bowling_alleys": {"name": "Bowling Alleys", "airChanges": 10},
        "theaters": {"name": "Theaters", "airChanges": 8},
        "auditoriums": {"name": "Conference Halls", "airChanges": 15},
        "assembly_halls": {"name": "Meeting Rooms", "airChanges": 8},
        "recreation_rooms": {"name": "Recreation Rooms", "airChanges": 10},
        "retail_stores": {"name": "Retail Stores", "airChanges": 8},
        "warehouses": {"name": "Warehouses", "airChanges": 6},
        "shops_general": {"name": "Shops (General)", "airChanges": 8},
        "garages": {"name": "Garages", "airChanges": 12},
        "residences": {"name": "Residences", "airChanges": 12},
        "toilets": {"name": "Toilets", "airChanges": 12},
        "boiler_rooms": {"name": "Boiler Rooms", "airChanges": 15},
        "engine_rooms": {"name": "Engine Rooms", "airChanges": 40},
        "generator_rooms": {"name": "Generator Rooms", "airChanges": 30},
        "transformer_rooms": {"name": "Transformer Rooms", "airChanges": 12},
        "turbine_rooms": {"name": "Turbine Rooms", "airChanges": 10},
        "machine_rooms": {"name": "Machine Rooms", "airChanges": 25},
        "paint_shop_suction": {"name": "Paint Shop (Exhaust)", "airChanges": 10},
        "paint_shop_spray": {"name": "Paint Shop (Spray)", "airChanges": 40},
        "welding_workshops": {"name": "Welding Workshops", "airChanges": 22},
        "quality_control": {"name": "Quality Control", "airChanges": 40},
        "factories": {"name": "Factories (General)", "airChanges": 30},
        "foundries": {"name": "Foundries", "airChanges": 12},
        "forges": {"name": "Forges", "airChanges": 12},
        "machine_shops": {"name": "Machine Shops", "airChanges": 12},
        "assembly_lines": {"name": "Assembly Lines", "airChanges": 30},
        "packing_houses": {"name": "Packing Houses", "airChanges": 6},
        "textile_mills": {"name": "Textile Mills", "airChanges": 10},
        "dry_cleaners": {"name": "Dry Cleaners", "airChanges": 12}
    }
    
    # Determine air changes per hour
    air_changes = 12  # default
    if manual_air_changes:
        air_changes = custom_air_changes
    elif application_area:
        selected_area = application_areas.get(application_area, {})
        air_changes = selected_area.get("airChanges", 12)
    
    # Base calculations
    volume = area * height  # m³
    required_airflow = volume * air_changes  # m³/h
    
    # Additional people airflow need (approx.)
    people_airflow = people * 50  # m³/h per person
    total_airflow = required_airflow + people_airflow
    
    # Cooling load estimation (kW)
    cooling_load_per_m2 = 0.12  # kW/m²
    cooling_load = area * cooling_load_per_m2
    
    # Water consumption (L/h)
    water_consumption = calculate_water_consumption(outdoor_temp, humidity, total_airflow)
    
    # Power comparison (kW)
    conventional_power_kw = cooling_load / 3.0  # assumes COP=3
    
    # FES cooler units
    cooler_types = {
        "fes25": {"name": "FES25", "model": "FES25-APB/APT", "capacity": 25000, "power": 2.2},
        "fes30": {"name": "FES30", "model": "FES30-APB/APT", "capacity": 30000, "power": 3.0},
        "fes35plug": {"name": "FES35", "model": "FES35-PLUG", "capacity": 35000, "power": 11.2}
    }
    
    # Build options for each device
    cooler_options = []
    for key, cooler in cooler_types.items():
        required_units = max(1, round(total_airflow / cooler["capacity"]))
        total_capacity = required_units * cooler["capacity"]
        total_power = required_units * cooler["power"]
        efficiency = min(100, round((total_airflow / total_capacity) * 100))
        
        cooler_options.append({
            "key": key,
            "name": cooler["name"],
            "model": cooler["model"],
            "capacity": cooler["capacity"],
            "power": cooler["power"],
            "required_units": required_units,
            "total_power": round(total_power, 1),
            "total_capacity": total_capacity,
            "efficiency": efficiency
        })
    
    # Recommend FES30 by default
    recommended_option = next((opt for opt in cooler_options if opt["key"] == "fes30"), cooler_options[0])
    
    evaporative_power_kw = recommended_option["total_power"]
    power_difference_kw = conventional_power_kw - evaporative_power_kw
    power_savings = round((power_difference_kw / conventional_power_kw) * 100) if conventional_power_kw > 0 else 0
    
    # Summer cost assumptions (May-Sep: 5 months)
    electricity_rate = 1.5  # ₺/kWh
    water_rate = 15  # ₺/ton
    summer_operating_hours = 900  # 5 months × 6h/day × 30d
    
    # CO₂ (Turkey grid factor: 0.45 kg CO2/kWh) - summer only
    carbon_factor = 0.45  # kg CO₂/kWh
    conventional_co2 = (conventional_power_kw * summer_operating_hours * carbon_factor) / 1000  # tons
    evaporative_co2 = (evaporative_power_kw * summer_operating_hours * carbon_factor) / 1000  # tons
    co2_savings = conventional_co2 - evaporative_co2
    
    conventional_electricity_cost = conventional_power_kw * summer_operating_hours * electricity_rate
    evaporative_electricity_cost = evaporative_power_kw * summer_operating_hours * electricity_rate
    annual_water_cost = ((water_consumption * summer_operating_hours) / 1000) * water_rate  # ton water
    total_evaporative_cost = evaporative_electricity_cost + annual_water_cost
    annual_savings = conventional_electricity_cost - total_evaporative_cost
    
    return {
        "total_load": round(cooling_load, 1),
        "air_changes": air_changes,
        "required_airflow": round(total_airflow),
        "conventional_power_kw": round(conventional_power_kw, 1),
        "power_savings": power_savings,
        "water_consumption": round(water_consumption, 1),
        "co2_savings": round(co2_savings, 1),
        "conventional_co2": round(conventional_co2, 1),
        "evaporative_co2": round(evaporative_co2, 1),
        "annual_electricity_cost": round(conventional_electricity_cost),
        "annual_water_cost": round(annual_water_cost),
        "annual_savings": round(annual_savings),
        "cooler_options": cooler_options,
        "recommended_option": recommended_option
    }

def get_application_areas():
    """Return all application areas grouped by category."""
    return {
        "🏭 PLASTIC AND RUBBER": [
            ("plastic_injection", "Plastic Injection", 35),
            ("polyester_production", "Polyester Bag & Film Production", 40),
            ("plastic_extrusion", "Plastic Extrusion", 30),
            ("plastic_labels", "Plastic Labels and Printing Films", 35),
            ("rubber_calendering", "Rubber Calendering", 40),
            ("rubber_vulcanization", "Rubber Vulcanization", 40),
            ("rubber_extrusion", "Rubber Extrusion and Grinding", 40)
        ],
        "⚡ METAL PROCESSING": [
            ("metal_casting", "Metal Casting", 40),
            ("metal_processing", "Metal Processing, Milling, Pressing", 25),
            ("metal_welding", "Metal Welding", 35),
            ("metal_forming", "Metal Forming", 35),
            ("metal_spraying", "Metal Spraying", 35)
        ],
        "👔 GARMENT AND TEXTILE": [
            ("garment_cutting", "Garment Cutting, Sewing", 30),
            ("garment_ironing", "Garment Ironing", 40),
            ("laundry", "Laundry", 12),
            ("textile_mills", "Textile Mills", 10),
            ("dry_cleaners", "Dry Cleaners", 12)
        ],
        "🍽️ FOOD AND RESTAURANT": [
            ("food_production", "Food Production", 40),
            ("food_sterilization", "Food Sterilization", 40),
            ("food_packaging", "Food Packaging, Canning", 30),
            ("kitchens", "Kitchens", 20),
            ("restaurants", "Restaurants", 12),
            ("bakeries", "Bakeries", 20),
            ("canteen", "Canteen & Cafeteria", 27)
        ],
        "🏃‍♂️ SPORTS AND LEISURE": [
            ("gymnasiums", "Gymnasiums", 12),
            ("bowling_alleys", "Bowling Alleys", 10),
            ("theaters", "Theaters", 8),
            ("auditoriums", "Conference Halls", 15),
            ("assembly_halls", "Meeting Rooms", 8),
            ("recreation_rooms", "Recreation Rooms", 10)
        ],
        "🏪 COMMERCE AND STORAGE": [
            ("retail_stores", "Retail Stores", 8),
            ("warehouses", "Warehouses", 6),
            ("shops_general", "Shops (General)", 8),
            ("packing_houses", "Packing Houses", 6)
        ],
        "🏠 RESIDENTIAL AND GENERAL": [
            ("residences", "Residences", 12),
            ("toilets", "Toilets", 12),
            ("garages", "Garages", 12)
        ],
        "⚡ ENERGY AND TECHNICAL FACILITIES": [
            ("boiler_rooms", "Boiler Rooms", 15),
            ("engine_rooms", "Engine Rooms", 40),
            ("generator_rooms", "Generator Rooms", 30),
            ("transformer_rooms", "Transformer Rooms", 12),
            ("turbine_rooms", "Turbine Rooms", 10),
            ("machine_rooms", "Machine Rooms", 25)
        ],
        "🎨 PAINTING & WORKSHOP": [
            ("paint_shop_suction", "Paint Shop (Exhaust)", 10),
            ("paint_shop_spray", "Paint Shop (Spray)", 40),
            ("welding_workshops", "Welding Workshops", 22),
            ("machine_shops", "Machine Shops", 12)
        ],
        "🏭 FACTORY & PRODUCTION": [
            ("quality_control", "Quality Control", 40),
            ("factories", "Factories (General)", 30),
            ("foundries", "Foundries", 12),
            ("forges", "Forges", 12),
            ("assembly_lines", "Assembly Lines", 30)
        ]
    }
