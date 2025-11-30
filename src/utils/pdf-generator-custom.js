/**
 * Custom PDF Generator for Cost Reports
 * Supports Thai language and multiple tables with same column structure
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import Thai fonts
import fonts from '../../public/fonts/sarabun-fonts.js';

/**
 * Create PDF with custom header and multiple tables
 * @param {Object} jsonData - Data structure with header and tables
 * @returns {jsPDF} The PDF document
 */
export function createCostPDF(jsonData) {
  const { header, tables } = jsonData;
  
  // Validate input
  if (!header || !tables || !Array.isArray(tables)) {
    console.error('Invalid data structure. Expected { header: {...}, tables: [...] }');
    return null;
  }

  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait', // Portrait orientation
    unit: 'mm',
    format: 'a4'
  });

  // Add and set Thai font
  doc.addFileToVFS('Sarabun-Regular.ttf', fonts.Sarabun);
  doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
  doc.addFileToVFS('Sarabun-Bold.ttf', fonts.SarabunBold);
  doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold');
  
  // Set font for Thai support
  doc.setFont('Sarabun');
  
  // Add custom header text
  doc.setFontSize(10);
  doc.setTextColor(40);
  
  // Build header text with data interpolation
  const headerText = buildHeaderText(header);
  
  // Add header (wrap to multiple lines for portrait) - A4 portrait width ~210mm, with margins ~180mm
  const headerLines = doc.splitTextToSize(headerText, 180);
  doc.text(headerLines, 14, 15);
  
  // Calculate starting Y position after header
  const headerHeight = headerLines.length * 7; // Approximate line height
  let currentY = 15 + headerHeight + 5;
  
  // Column definitions (same for all tables)
  const columns = [
    { header: 'รหัส', dataKey: 'code' },
    { header: 'ประเภท', dataKey: 'type' },
    { header: 'รายการสินค้า', dataKey: 'name' },
    { header: 'จำนวนชิ้น', dataKey: 'amount' },
    { header: 'ระยะ', dataKey: 'range' },
    { header: 'ค่าของรวม', dataKey: 'parts_total' },
    { header: 'ค่าแรงรวม', dataKey: 'wage_total' },
    { header: 'ราคารวม', dataKey: 'total' },
  ];
  
  // Process each table
  tables.forEach((table, index) => {
    const { tablename, rows, type = 'default' } = table;
    
    // Add table name/title
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.setFont('Sarabun', 'bold');
    doc.text(tablename || `Table ${index + 1}`, 14, currentY);
    
    currentY += 5;
    
    // Handle different table types
    if (type === 'cost') {
      // Cost table type
      const part_price = rows.part_price || 0;
      const wage_price = rows.wage_price || 0;
      const totalCost = part_price + wage_price;
      
      const tableData = [
        ['แรงสูง +แรงต่ำ +อุปกรณ์เพิ่มเติม', part_price, wage_price],
        ['', 'รวม', totalCost],
      ];
      
      autoTable(doc, {
        startY: currentY,
        head: [['ต้นทุนรวมอุปกรณ์ + ค่าแรง', 'ค่าของรวม', 'ค่าแรงรวม']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center',
          font: 'Sarabun',
          cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
          minCellHeight: 8,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        styles: {
          fontSize: 9,
          cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
          minCellHeight: 8,
          font: 'Sarabun',
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255],
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 80 },
          1: { halign: 'right', cellWidth: 50 },
          2: { halign: 'right', cellWidth: 50, fontStyle: 'bold' },
        },
        margin: { left: 14 },
      });
      
    } else if (type === 'distance') {
      // Distance table type with 2-level headers
      const tableData = rows.map(row => [
        row.distance || '',
        row.travel_cost || 0,
        row.travel_between_accommodation || 0,
        row.accommodation_food || 0,
        row.wage || 0,
        row.total || 0,
      ]);
      
      autoTable(doc, {
        startY: currentY,
        head: [
          [{content: 'ค่าเดินทาง', colSpan: 6, styles: { halign: 'center' }}],
          ['ระยะทาง', 'ค่าเดินทาง', 'ค่าเดินทางระหว่างที่พัก', 'ค่าที่พัก + ค่าอาหาร', 'ค่าแรง', 'รวม']
        ],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          font: 'Sarabun',
          cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
          minCellHeight: 8,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        styles: {
          fontSize: 9,
          cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
          minCellHeight: 8,
          font: 'Sarabun',
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 25 },
          1: { halign: 'right', cellWidth: 30 },
          2: { halign: 'right', cellWidth: 35 },
          3: { halign: 'right', cellWidth: 35 },
          4: { halign: 'right', cellWidth: 25 },
          5: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
        },
        margin: { left: 14 },
      });
      
    } else {
      // Default table type (original)
      const tableData = rows.map(row => [
        row.code || '',
        row.type || '',
        row.name || '',
        row.amount || 0,
        row.range || 0,
        row.parts_total || 0,
        row.wage_total || 0,
        row.total || 0,
      ]);
      
      // Calculate totals for footer row
      const sumPartsTotal = rows.reduce((sum, row) => sum + (row.parts_total || 0), 0);
      const sumWageTotal = rows.reduce((sum, row) => sum + (row.wage_total || 0), 0);
      const sumTotal = rows.reduce((sum, row) => sum + (row.total || 0), 0);
      
      // Create footer row with "Total" at position 4 (ระยะ column)
      const footerRow = ['', '', '', '', 'Total', sumPartsTotal, sumWageTotal, sumTotal];
      
      autoTable(doc, {
        startY: currentY,
        head: [columns.map(col => col.header)],
        body: tableData,
        foot: [footerRow],
        theme: 'grid',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center',
          font: 'Sarabun',
          cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
          minCellHeight: 8,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        footStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'right',
          font: 'Sarabun',
          cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
          minCellHeight: 8,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        styles: {
          fontSize: 9,
          cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
          minCellHeight: 8,
          font: 'Sarabun',
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 }, // รหัส
          1: { halign: 'center', cellWidth: 20 }, // ประเภท
          2: { halign: 'left', cellWidth: 45 },   // รายการสินค้า
          3: { halign: 'center', cellWidth: 20 }, // จำนวนชิ้น
          4: { halign: 'center', cellWidth: 15 }, // ระยะ (Total will appear here)
          5: { halign: 'right', cellWidth: 23 },  // ค่าของรวม
          6: { halign: 'right', cellWidth: 23 },  // ค่าแรงรวม
          7: { halign: 'right', cellWidth: 23, fontStyle: 'bold' }, // ราคารวม
        },
        margin: { left: 14 },
      });
    }
    
    // Update Y position for next table
    currentY = doc.lastAutoTable.finalY + 8;
    
    // Add new page if needed and there are more tables
    if (index < tables.length - 1 && currentY > 180) {
      doc.addPage();
      currentY = 20;
    }
  });
  
  // Add summary section if provided
  if (jsonData.summary) {
    const summary = jsonData.summary;
    
    // Check if we need a new page
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }
    
    // Add summary title
    doc.setFontSize(12);
    doc.setFont('Sarabun', 'bold');
    doc.text('สรุป', 14, currentY);
    currentY += 10;
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const leftX = 14;
    const leftColumnWidth = (pageWidth - 28) * 0.65; // 65% of usable width
    const rightX = leftX + leftColumnWidth + 5; // Right column starts after 70% + spacing
    const startY = currentY;
    
    // Left column - Labor and vehicles
    doc.setFontSize(10);
    doc.setFont('Sarabun', 'normal');
    
    let leftY = startY;
    const lineHeight = 7;
    
    // Define tab positions for alignment (within 60% width)
    const col1 = leftX;           // Label start
    const col2 = leftX + 35;      // First number
    const col3 = leftX + 45;      // "คน" position
    const col4 = leftX + 50;      // "ทำงาน" text
    const col5 = leftX + 70;      // Second number (days)
    const col6 = leftX + 75;      // "วัน" position
    const col7 = leftX + 80;     // "รวม" text
    const col8 = leftX + 90;     // Final number
    
    // Row 1: Workers - ใช้คนทำงาน 10 คน ทำงาน 5 วัน รวม 50 แรงงาน
    doc.text('ใช้คนทำงาน', col1, leftY);
    doc.text(String(summary.workers || '___'), col2, leftY, { align: 'right' });
    doc.text('คน', col3, leftY);
    doc.text('ทำงาน', col4, leftY);
    doc.text(String(summary.work_days || '___'), col5, leftY, { align: 'right' });
    doc.text('วัน', col6, leftY);
    doc.text('รวม', col7, leftY);
    doc.text(String(summary.total_labor || '___'), col8, leftY);
    doc.text('แรงงาน', col8 + 10, leftY);
    leftY += lineHeight;
    
    // Row 2: Trucks - ใช้รถยนต์บรรทุก 2 คัน ทำงาน 3 วัน รวม 6 เที่ยว
    doc.text('ใช้รถยนต์บรรทุก', col1, leftY);
    doc.text(String(summary.trucks || '___'), col2, leftY, { align: 'right' });
    doc.text('คัน', col3, leftY);
    doc.text('ทำงาน', col4, leftY);
    doc.text(String(summary.truck_days || '___'), col5, leftY, { align: 'right' });
    doc.text('วัน', col6, leftY);
    doc.text('รวม', col7, leftY);
    doc.text(String(summary.total_truck_trips || '___'), col8, leftY);
    doc.text('เที่ยว', col8 + 10, leftY);
    leftY += lineHeight;
    
    // Row 3: Cars - นั่ง 1 คัน ทำงาน 5 วัน รวม 5 เที่ยว
    doc.text('นั่ง', col1, leftY);
    doc.text(String(summary.cars || '___'), col2, leftY, { align: 'right' });
    doc.text('คัน', col3, leftY);
    doc.text('ทำงาน', col4, leftY);
    doc.text(String(summary.car_days || '___'), col5, leftY, { align: 'right' });
    doc.text('วัน', col6, leftY);
    doc.text('รวม', col7, leftY);
    doc.text(String(summary.total_car_trips || '___'), col8, leftY);
    doc.text('เที่ยว', col8 + 10, leftY);
    leftY += lineHeight;
    
    // Row 4: Hiab - เฮี๊ยบ 1 คัน ทำงาน 2 วัน รวม 2 เที่ยว
    doc.text('เฮี๊ยบ', col1, leftY);
    doc.text(String(summary.hiab || '___'), col2, leftY, { align: 'right' });
    doc.text('คัน', col3, leftY);
    doc.text('ทำงาน', col4, leftY);
    doc.text(String(summary.hiab_days || '___'), col5, leftY, { align: 'right' });
    doc.text('วัน', col6, leftY);
    doc.text('รวม', col7, leftY);
    doc.text(String(summary.total_hiab_trips || '___'), col8, leftY);
    doc.text('เที่ยว', col8 + 10, leftY);
    
    // Draw vertical line separator (at 60% mark)
    const separatorX = leftX + leftColumnWidth;
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(separatorX, startY - 5, separatorX, leftY +10);
    
    // Right column - Cost summary
    let rightY = startY;
    
    doc.text(`ต้นทุนรวม = ${summary.total_cost || '___'}`, rightX, rightY);
    rightY += lineHeight;
    
    doc.text(`ค่าเดินทาง = ${summary.travel_cost || '___'}`, rightX, rightY);
    rightY += lineHeight;
    
    doc.text(`กำไร ${summary.profit || '___'}% เป็นเงิน = ${summary.profit_amount || '___'}`, rightX, rightY);
    rightY += lineHeight;
    
    doc.text(`ต้นทุน + กำไร = ${summary.cost_and_profit || '___'}`, rightX, rightY);
    rightY += lineHeight;
    
    doc.text(`ค่า Com ${summary.commission || '___'}% เป็นเงิน = ${summary.commission_amount || '___'}`, rightX, rightY);
    
    currentY = Math.max(leftY, rightY) + 15;
  }
  
  // Add signature section
  // Check if we need a new page
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }
  
  currentY += 10; // Add some spacing
  
  doc.setFontSize(10);
  doc.setFont('Sarabun', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftSignX = 30;
  const rightSignX = pageWidth / 2 + 15;
  
  // Left signature: ผู้ทำราคา
  doc.text('ผู้ทำราคา', leftSignX, currentY);
  doc.line(leftSignX + 25, currentY, leftSignX + 70, currentY); // Signature line
  
  // Right signature: ผู้อนุมัติ
  doc.text('ผู้อนุมัติ', rightSignX, currentY);
  doc.line(rightSignX + 25, currentY, rightSignX + 70, currentY); // Signature line
  
  // Add page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Save PDF
  doc.save('cost-report.pdf');
  
  return doc;
}

/**
 * Build header text from header object
 * Replaces {data1}, {data2}, etc. with actual values
 * @param {Object} header - Header data object
 * @returns {string} Formatted header text
 */
function buildHeaderText(header) {
  const {
    prefix = 'cost #1.1',
    data1 = '',
    data2 = '',
    data3 = '',
    data4 = '',
    template = null
  } = header;
  
  // If custom template provided, use it
  if (template) {
    return template
      .replace('{data1}', data1)
      .replace('{data2}', data2)
      .replace('{data3}', data3)
      .replace('{data4}', data4);
  }
  
  // Default template with new format
  return `${prefix}_ใบถอดต้นทุน EV ${data1} สถานที่ ${data2} พนง.ขาย ${data3} วันที่ ${data4}`.trim();
}

/**
 * Simplified version - auto-generate header from object
 * @param {Object} jsonData - Data with header and tables
 * @param {Object} options - PDF options
 */
export function createCostPDFSimple(jsonData, options = {}) {
  const {
    filename = 'cost-report.pdf',
    theme = 'grid',
    headerColor = [41, 128, 185],
  } = options;
  
  const { header, tables } = jsonData;
  
  if (!tables || !Array.isArray(tables)) {
    console.error('Invalid data structure');
    return null;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Add and set Thai font
  doc.addFileToVFS('Sarabun-Regular.ttf', fonts.Sarabun);
  doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
  doc.addFileToVFS('Sarabun-Bold.ttf', fonts.SarabunBold);
  doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold');
  
  doc.setFont('Sarabun');
  
  // Header
  doc.setFontSize(12);
  doc.setTextColor(40);
  const headerText = buildHeaderText(header);
  const headerLines = doc.splitTextToSize(headerText, 180);
  doc.text(headerLines, 14, 15);
  
  const headerHeight = headerLines.length * 7;
  let currentY = 15 + headerHeight + 5;
  
  // Column headers (Thai)
  const columnHeaders = ['รหัส', 'ประเภท', 'รายการสินค้า', 'จำนวนชิ้น', 'ระยะ', 'ค่าของรวม', 'ค่าแรงรวม', 'ราคารวม'];
  
  // Process each table
  tables.forEach((table, index) => {
    // Table title
    doc.setFontSize(12);
    doc.setFont('Sarabun', 'bold');
    doc.text(table.tablename || `Table ${index + 1}`, 14, currentY);
    currentY += 7;
    
    // Prepare data
    const tableData = table.rows.map(row => [
      row.code || '',
      row.type || '',
      row.name || '',
      row.amount || 0,
      row.range || 0,
      row.parts_total || 0,
      row.wage_total || 0,
      row.total || 0,
    ]);
    
    // Calculate totals for footer row
    const sumPartsTotal = table.rows.reduce((sum, row) => sum + (row.parts_total || 0), 0);
    const sumWageTotal = table.rows.reduce((sum, row) => sum + (row.wage_total || 0), 0);
    const sumTotal = table.rows.reduce((sum, row) => sum + (row.total || 0), 0);
    
    // Create footer row with "Total" at position 4 (ระยะ column)
    const footerRow = ['', '', '', '', 'Total', sumPartsTotal, sumWageTotal, sumTotal];
    
    // Generate table
    autoTable(doc, {
      startY: currentY,
      head: [columnHeaders],
      body: tableData,
      foot: [footerRow],
      theme: theme,
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center',
      font: 'Sarabun',
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'right',
      font: 'Sarabun',
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      font: 'Sarabun',
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'left', cellWidth: 45 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'right', cellWidth: 23 },
        6: { halign: 'right', cellWidth: 23 },
        7: { halign: 'right', cellWidth: 23, fontStyle: 'bold' },
      },
      margin: { left: 14 },
    });
    
    currentY = doc.lastAutoTable.finalY + 15;
    
    if (index < tables.length - 1 && currentY > 180) {
      doc.addPage();
      currentY = 20;
    }
  });
  
  // Page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(filename);
  return doc;
}

export default {
  createCostPDF,
  createCostPDFSimple,
};

