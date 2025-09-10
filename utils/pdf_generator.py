"""
PDF generation utilities for the FES Calculator application.
Handles PDF report generation with Unicode support.
"""

import os
import tempfile
from datetime import datetime
from fpdf import FPDF
import sys

def generate_pdf_report(project_data, input_data, result):
    """
    Generate a PDF report with calculation results.
    Uses UTF-8 encoding to support Unicode characters.
    """
    # Create a temporary file
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    
    try:
        # Create PDF with Unicode support
        pdf = FPDF()
        pdf.add_page()
        
        # Try to add Unicode font support
        try:
            # This is the key fix - enable Unicode support
            pdf.add_font('Arial', '', '', uni=True)
            pdf.set_font("Arial", size=12)
        except:
            # Fallback if Unicode font not available
            pdf.set_font("Arial", size=12)
        
        # Title
        pdf.set_font("Arial", 'B', 16)
        pdf.cell(0, 10, "FES Evaporative Cooling Calculation Report", ln=True, align='C')
        pdf.ln(10)
        
        # Project information
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(0, 10, "Project Information", ln=True)
        pdf.set_font("Arial", size=10)
        
        # Safely handle potential Unicode in project data
        def safe_text(text):
            if text is None:
                return ""
            if isinstance(text, str):
                # Remove or replace problematic characters
                return text.encode('ascii', 'ignore').decode('ascii')
            return str(text)
        
        pdf.cell(0, 8, f"Project Name: {safe_text(project_data['project_name'])}", ln=True)
        pdf.cell(0, 8, f"Company Name: {safe_text(project_data['company_name'])}", ln=True)
        pdf.cell(0, 8, f"City: {safe_text(project_data['city'])}", ln=True)
        pdf.cell(0, 8, f"Phone: {safe_text(project_data['phone'])}", ln=True)
        pdf.cell(0, 8, f"Email: {safe_text(project_data['email'])}", ln=True)
        pdf.cell(0, 8, f"Date: {datetime.now().strftime('%Y-%m-%d')}", ln=True)
        pdf.ln(10)
        
        # Input data
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(0, 10, "Input Data", ln=True)
        pdf.set_font("Arial", size=10)
        pdf.cell(0, 8, f"Area: {input_data['area']} m²", ln=True)
        pdf.cell(0, 8, f"Height: {input_data['height']} m", ln=True)
        pdf.cell(0, 8, f"People: {input_data['people']}", ln=True)
        pdf.cell(0, 8, f"Outdoor Temperature: {input_data['outdoor_temp']}°C", ln=True)
        pdf.cell(0, 8, f"Relative Humidity: {input_data['humidity']}%", ln=True)
        pdf.cell(0, 8, f"Air Changes: {result['air_changes']} ACH", ln=True)
        pdf.ln(10)
        
        # Results
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(0, 10, "Calculation Results", ln=True)
        pdf.set_font("Arial", size=10)
        pdf.cell(0, 8, f"Total Airflow: {result['required_airflow']:,} m³/h", ln=True)
        pdf.cell(0, 8, f"Cooling Load: {result['total_load']} kW", ln=True)
        pdf.ln(10)
        
        # Unit selection
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(0, 10, "Unit Selection", ln=True)
        pdf.set_font("Arial", size=10)
        
        for option in result["cooler_options"]:
            is_recommended = option["key"] == result["recommended_option"]["key"]
            status = " (RECOMMENDED)" if is_recommended else ""
            
            pdf.cell(0, 8, f"{option['model']}{status}", ln=True)
            pdf.cell(0, 6, f"  Units Required: {option['required_units']}", ln=True)
            pdf.cell(0, 6, f"  Unit Capacity: {option['capacity']:,} m³/h", ln=True)
            pdf.cell(0, 6, f"  Total Power: {option['total_power']} kW", ln=True)
            pdf.cell(0, 6, f"  Efficiency: {option['efficiency']}%", ln=True)
            pdf.ln(2)
        
        # Power comparison
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(0, 10, "Power Comparison", ln=True)
        pdf.set_font("Arial", size=10)
        pdf.cell(0, 8, f"Conventional AC: {result['conventional_power_kw']} kW", ln=True)
        pdf.cell(0, 8, f"FES Evaporative: {result['recommended_option']['total_power']} kW", ln=True)
        pdf.cell(0, 8, f"Power Savings: {result['power_savings']}%", ln=True)
        pdf.ln(10)
        
        # Water consumption
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(0, 10, "Water Consumption", ln=True)
        pdf.set_font("Arial", size=10)
        pdf.cell(0, 8, f"Hourly: {result['water_consumption']:.1f} L/h", ln=True)
        pdf.cell(0, 8, f"Daily (6 hours): {(result['water_consumption'] * 6):.0f} L/day", ln=True)
        pdf.cell(0, 8, f"Weekly: {(result['water_consumption'] * 6 * 7):.0f} L/week", ln=True)
        pdf.cell(0, 8, f"Monthly: {(result['water_consumption'] * 6 * 30):.0f} L/month", ln=True)
        pdf.ln(10)
        
        # CO2 savings
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(0, 10, "CO2 Emissions Comparison", ln=True)
        pdf.set_font("Arial", size=10)
        pdf.cell(0, 8, f"Conventional AC: {result['conventional_co2']} tons CO2/5 months", ln=True)
        pdf.cell(0, 8, f"FES Evaporative: {result['evaporative_co2']} tons CO2/5 months", ln=True)
        pdf.cell(0, 8, f"CO2 Savings: {result['co2_savings']} tons CO2", ln=True)
        pdf.ln(10)
        
        # Cost analysis
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(0, 10, "Cost Analysis (5 months)", ln=True)
        pdf.set_font("Arial", size=10)
        pdf.cell(0, 8, f"Conventional AC (Electricity): {result['annual_electricity_cost']} ₺", ln=True)
        pdf.cell(0, 8, f"FES Evaporative (Electricity): {result['annual_electricity_cost'] - result['annual_savings'] - result['annual_water_cost']} ₺", ln=True)
        pdf.cell(0, 8, f"FES Evaporative (Water): {result['annual_water_cost']} ₺", ln=True)
        pdf.cell(0, 8, f"Total Savings: {result['annual_savings']} ₺", ln=True)
        pdf.ln(10)
        
        # Contact information
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(0, 10, "Contact Information", ln=True)
        pdf.set_font("Arial", size=10)
        pdf.cell(0, 8, "Erdinç Klima - FES Evaporative Cooling Solutions", ln=True)
        pdf.cell(0, 8, "Phone: 0532 424 62 19", ln=True)
        pdf.cell(0, 8, "Email: info@erdincklima.com", ln=True)
        pdf.cell(0, 8, "Web: www.erdincklima.com", ln=True)
        
        # Save PDF with proper encoding
        try:
            # Try modern FPDF output method
            pdf.output(tmp_file.name, 'F')
        except:
            # Fallback to older method
            try:
                pdf.output(tmp_file.name)
            except Exception as e:
                # If all else fails, create a simple text file as fallback
                with open(tmp_file.name, 'w', encoding='utf-8') as f:
                    f.write("PDF Generation Failed\n")
                    f.write(f"Error: {str(e)}\n")
                    f.write("Please try again or contact support.\n")
        
        return tmp_file.name
    
    except Exception as e:
        # Handle any other errors gracefully
        with open(tmp_file.name, 'w', encoding='utf-8') as f:
            f.write("PDF Generation Error\n")
            f.write(f"Error: {str(e)}\n")
            f.write("Please check your input data and try again.\n")
        return tmp_file.name