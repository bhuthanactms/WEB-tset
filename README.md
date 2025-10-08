# EV station Calculator

A Python-based web application for calculating evaporative cooling requirements using Streamlit.

## Features

- User authentication with demo accounts
- Unit selection and comparison
- Cost 
- PDF report generation
- Responsive design

## Installation

1. Clone this repository
2. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

## Usage

Run the application:
```
streamlit run app.py
```

## Demo Accounts

| Username | Password |
|----------|----------|
| admin    | admin123 |
| user1    | pass123  |
| demo     | demo123  |
| guest    | guest123 |


## Features Overview

### Login Page
- Simple authentication with demo accounts
- Quick access buttons for demo accounts
- Responsive design

### Calculator
- Space information input (area, height, people)
- Application area selection with predefined air change rates
- Environmental conditions (temperature, humidity)
- Manual air change rate option

### Results
- Calculated airflow requirements
- Unit selection with capacity and power details
- Power comparison between conventional AC and evaporative cooling
- Water consumption analysis
- CO₂ emissions comparison
- Cost savings analysis

### PDF Reports
- Comprehensive PDF reports with calculation results
- Project information inclusion
- Professional formatting

## Technologies Used

- Python
- Streamlit
- FPDF2 for PDF generation
- Pandas for data handling
- Custom CSS for styling

## Development

This application was developed to provide a simple, web-based tool for calculating evaporative cooling requirements. It is designed to be intuitive and provide comprehensive results for decision-making.

## License

This project is for demonstration purposes only.
