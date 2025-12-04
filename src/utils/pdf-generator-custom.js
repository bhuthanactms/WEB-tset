/**
 * Custom PDF Generator for Cost Reports
 * Supports Thai language and multiple tables with same column structure
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import Thai fonts
import fonts from '../../public/fonts/sarabun-fonts.js';

/**
 * Format number as currency with comma and "บาท" unit
 * @param {number} value - Number to format
 * @returns {string} Formatted currency string (e.g., "150,000 บาท")
 */
function formatCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return '0 บาท';
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    return '0 บาท';
  }
  return num.toLocaleString('th-TH') + ' บาท';
}

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

  // ปรับ encoding เพื่อรองรับภาษาไทยและสระให้ถูกต้อง
  // jsPDF ควรจะรองรับ UTF-8 โดยอัตโนมัติ แต่เราต้องแน่ใจว่า font รองรับ

  // Helper function to draw dashed underline
  const drawDashedUnderline = (x, y, text, fontSize) => {
    const textWidth = doc.getTextWidth(text);
    const dashLength = 1;
    const gapLength = 1;
    let dashX = x;
    doc.setLineWidth(0.1);
    doc.setDrawColor(0, 0, 0);
    while (dashX < x + textWidth) {
      doc.line(dashX, y + 1, Math.min(dashX + dashLength, x + textWidth), y + 1);
      dashX += dashLength + gapLength;
    }
  };

  // Add custom header text
  doc.setFontSize(11); // เพิ่ม 4 size จาก 7
  doc.setFont('Sarabun', 'bold'); // ทำตัวหนา
  doc.setTextColor(40);

  // Build header text with data interpolation
  const headerResult = buildHeaderText(header);
  const headerText = headerResult.text || headerResult;
  const headerValues = headerResult.values || [];

  // Add header (wrap to multiple lines for portrait) - A4 portrait width ~210mm, with margins ~180mm
  const headerLines = doc.splitTextToSize(headerText, 180);

  // วาด header พร้อมเส้นประใต้ค่าที่มี
  let headerY = 15;
  headerLines.forEach((line, lineIndex) => {
    let lineX = 14;
    let remainingLine = line;

    // แบ่งบรรทัดออกเป็นส่วนๆ เพื่อวาดเส้นประใต้ค่าที่มี
    if (headerValues && headerValues.length > 0) {
      // หาตำแหน่งของแต่ละค่าในบรรทัด
      const valuePositions = [];
      headerValues.forEach((value) => {
        if (value.hasValue && remainingLine.includes(value.text)) {
          const valueIndex = remainingLine.indexOf(value.text);
          if (valueIndex !== -1) {
            valuePositions.push({
              index: valueIndex,
              value: value.text,
              hasValue: true
            });
          }
        }
      });

      // เรียงลำดับตามตำแหน่ง
      valuePositions.sort((a, b) => a.index - b.index);

      // วาดข้อความทีละส่วน
      let currentIndex = 0;
      valuePositions.forEach((pos) => {
        // วาดข้อความก่อนค่า
        if (pos.index > currentIndex) {
          const beforeText = remainingLine.substring(currentIndex, pos.index);
          doc.setFontSize(11);
          doc.setFont('Sarabun', 'bold');
          doc.text(beforeText, lineX, headerY);
          lineX += doc.getTextWidth(beforeText);
        }

        // วาดค่าพร้อมเส้นประ
        doc.setFontSize(11);
        doc.setFont('Sarabun', 'bold');
        doc.text(pos.value, lineX, headerY);
        drawDashedUnderline(lineX, headerY, pos.value, 11);
        lineX += doc.getTextWidth(pos.value);

        currentIndex = pos.index + pos.value.length;
      });

      // วาดข้อความที่เหลือ
      if (currentIndex < remainingLine.length) {
        const afterText = remainingLine.substring(currentIndex);
        doc.setFontSize(11);
        doc.setFont('Sarabun', 'bold');
        doc.text(afterText, lineX, headerY);
      }
    } else {
      // ถ้าไม่มีค่าให้วาดปกติ
      doc.text(line, lineX, headerY);
    }

    headerY += 7;
  });

  // วาดเส้นขีดปิดใต้ header เพื่อแบ่งส่วน
  const headerHeight = headerLines.length * 7; // Approximate line height
  const separatorY = 15 + headerHeight + 0.5; // วางเส้นใต้ header ห่าง 0.5mm
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.line(14, separatorY, 196, separatorY); // เส้นเต็มความกว้าง (210mm - 14mm margin)

  // Calculate starting Y position after header
  let currentY = separatorY + 5; // ห่างจากเส้นขีด 5mm

  // Column definitions (same for all tables)
  const columns = [
    { header: 'รหัส', dataKey: 'code' },
    { header: 'ประเภท', dataKey: 'type' },
    { header: 'รายการสินค้า', dataKey: 'name' },
    { header: 'จำนวน', dataKey: 'amount' },
    { header: 'ระยะ(m)', dataKey: 'range' },
    { header: 'ค่าของรวม', dataKey: 'parts_total' },
    { header: 'ค่าแรงรวม', dataKey: 'wage_total' },
    { header: 'ราคารวม', dataKey: 'total' },
  ];

  // Process each table
  tables.forEach((table, index) => {
    const { tablename, rows, type = 'default' } = table;

    // Track starting page for this table
    const tableStartPage = doc.internal.getNumberOfPages();

    // Add table name/title for first page - วางใกล้ตารางมากขึ้น
    doc.setFontSize(9);
    doc.setTextColor(40);
    doc.setFont('Sarabun', 'bold');
    doc.text(tablename || `Table ${index + 1}`, 14, currentY);

    currentY += 2; // ลดระยะห่างจาก 5mm เป็น 2mm เพื่อให้ใกล้ตารางมากขึ้น

    // ตัวแปรสำหรับเก็บ startY สำหรับหน้าใหม่
    let continuationStartY = null;

    // Handle different table types
    if (type === 'cost') {
      // Cost table type - ตารางซ้าย-ขวา ข้างละ 7 แถว (ขยายจาก 6 เป็น 7)
      const costRows = rows.rows || [];
      const summaryMaterial = rows.summary_material || 0;
      const summaryLabor = rows.summary_labor || 0;
      const summaryTotal = rows.summary_total || 0;

      // สร้างข้อมูลสำหรับตารางซ้าย (หัวข้อ 1-7)
      const leftTableData = costRows.slice(0, 7).map(row => [
        row.type || '',
        formatCurrency(row.material || 0),
        formatCurrency(row.labor || 0),
        formatCurrency(row.total || 0)
      ]);

      // สร้างข้อมูลสำหรับตารางขวา (หัวข้อที่เหลือทั้งหมด + แถวสรุป)
      const rightTableData = [];
      // แสดงหัวข้อทั้งหมดที่เหลือ (เริ่มจาก index 7)
      const remainingRows = costRows.slice(7);
      remainingRows.forEach(row => {
        rightTableData.push([
          row.type || '',
          formatCurrency(row.material || 0),
          formatCurrency(row.labor || 0),
          formatCurrency(row.total || 0)
        ]);
      });

      // เพิ่มแถวว่างเพื่อให้ตารางขวามีความสูงพอๆ กับตารางซ้าย (อย่างน้อย 7 แถว)
      // แต่ถ้ามีหัวข้อมากกว่า 7 แถวแล้ว ก็ไม่ต้องเพิ่มแถวว่าง
      const minRows = 7; // ขยายจาก 6 เป็น 7
      while (rightTableData.length < minRows - 1) { // -1 เพราะจะเพิ่มแถวสรุป
        rightTableData.push(['', '', '', '']);
      }

      // แถวสุดท้าย: ต้นทุนรวมเบื้องต้น
      rightTableData.push([
        'ต้นทุนรวมเบื้องต้น',
        formatCurrency(summaryMaterial),
        formatCurrency(summaryLabor),
        formatCurrency(summaryTotal)
      ]);

      // คำนวณความกว้างที่ใช้ได้ทั้งหมด (ไม่ให้ล้นกระดาษ)
      const pageWidth = 210; // A4 width in mm
      const leftMargin = 14;
      const rightMargin = 14;
      const gap = 5; // ระยะห่างระหว่างตาราง
      const availableWidth = pageWidth - leftMargin - rightMargin - gap;
      const tableWidth = availableWidth / 2; // แต่ละตารางได้ความกว้างเท่ากัน
      const columnWidth = tableWidth / 4; // แต่ละคอลัมน์ได้ความกว้างเท่ากัน

      // คำนวณตำแหน่งเริ่มต้นของตารางขวา
      const rightTableStartX = leftMargin + tableWidth + gap;

      // ตารางซ้าย (หัวข้อ 1-6)
      autoTable(doc, {
        startY: currentY,
        head: [['ประเภท', 'ค่าของรวม', 'ค่าแรงรวม', 'ราคารวม']],
        body: leftTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          font: 'Sarabun',
          cellPadding: { top: 2, right: 1, bottom: 2, left: 1 },
          minCellHeight: 5,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        styles: {
          fontSize: 6,
          cellPadding: { top: 2, right: 1, bottom: 2, left: 1 },
          minCellHeight: 5,
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
          0: { halign: 'left', cellWidth: columnWidth },
          1: { halign: 'right', cellWidth: columnWidth },
          2: { halign: 'right', cellWidth: columnWidth },
          3: { halign: 'right', cellWidth: columnWidth, fontStyle: 'bold' },
        },
        margin: { left: leftMargin, right: pageWidth - leftMargin - tableWidth }, // คำนวณ margin ขวาให้พอดี
      });

      const leftTableEndY = doc.lastAutoTable.finalY;

      // ตารางขวา (หัวข้อ 7 + แถวสรุป)
      autoTable(doc, {
        startY: currentY,
        head: [['ประเภท', 'ค่าของรวม', 'ค่าแรงรวม', 'ราคารวม']],
        body: rightTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          font: 'Sarabun',
          cellPadding: { top: 2, right: 1, bottom: 2, left: 1 },
          minCellHeight: 5,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        styles: {
          fontSize: 6,
          cellPadding: { top: 2, right: 1, bottom: 2, left: 1 },
          minCellHeight: 5,
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
          0: { halign: 'left', cellWidth: columnWidth },
          1: { halign: 'right', cellWidth: columnWidth },
          2: { halign: 'right', cellWidth: columnWidth },
          3: { halign: 'right', cellWidth: columnWidth, fontStyle: 'bold' },
        },
        margin: { left: rightTableStartX, right: rightMargin }, // เริ่มจากตำแหน่งที่คำนวณได้
        willDrawCell: (data) => {
          // แถวสุดท้าย (ต้นทุนรวมเบื้องต้น) - เพิ่ม font size 1 และทำตัวหนา
          if (data.row.index === rightTableData.length - 1) {
            doc.setFontSize(7); // เพิ่มจาก 6 เป็น 7 (เพิ่ม 1 size)
            doc.setFont('Sarabun', 'bold');
          }
        },
        didDrawCell: (data) => {
          // Reset font หลังจากวาด cell
          if (data.row.index === rightTableData.length - 1) {
            doc.setFontSize(6);
            doc.setFont('Sarabun', 'normal');
          }
        },
      });

      // ใช้ตำแหน่งที่ตารางขวาจบ (หรือตารางซ้ายถ้าสูงกว่า)
      currentY = Math.max(leftTableEndY, doc.lastAutoTable.finalY);

    } else if (type === 'distance') {
      // Distance table type
      const firstRow = rows[0] || {};

      // ตรวจสอบว่ามีงานฝึกอบรมหรือไม่
      const hasTraining = firstRow.training_cost && firstRow.training_cost > 0;

      // สร้างหัวตาราง - ถ้ามีงานฝึกอบรมให้เพิ่มคอลัมน์ "งานฝึกอบรม (1 วัน)" ก่อน "ค่าแรง"
      const headers = hasTraining
        ? ['ระยะทาง', 'ค่าเดินทาง', 'ค่าเดินทางระหว่างที่พัก', 'ค่าที่พัก + ค่าอาหาร', 'งานฝึกอบรม (1 วัน)', 'ค่าแรง', 'รวม']
        : ['ระยะทาง', 'ค่าเดินทาง', 'ค่าเดินทางระหว่างที่พัก', 'ค่าที่พัก + ค่าอาหาร', 'ค่าแรง', 'รวม'];

      // สร้างข้อมูลแถว - ถ้ามีงานฝึกอบรมให้เพิ่มค่า "งานฝึกอบรม (1 วัน)" ก่อน "ค่าแรง"
      const tableData = [
        hasTraining
          ? [
            firstRow.distance || '',
            formatCurrency(firstRow.travel_cost || 0),
            formatCurrency(firstRow.travel_between_accommodation || 0),
            formatCurrency(firstRow.accommodation_food || 0),
            formatCurrency(firstRow.training_cost || 0), // งานฝึกอบรม (1 วัน)
            formatCurrency(firstRow.wage || 0), // ค่าแรง
            formatCurrency(firstRow.total || 0),
          ]
          : [
            firstRow.distance || '',
            formatCurrency(firstRow.travel_cost || 0),
            formatCurrency(firstRow.travel_between_accommodation || 0),
            formatCurrency(firstRow.accommodation_food || 0),
            formatCurrency(firstRow.wage || 0), // ค่าแรง
            formatCurrency(firstRow.total || 0),
          ]
      ];

      autoTable(doc, {
        startY: currentY,
        head: [headers],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 5,
          fontStyle: 'bold',
          halign: 'center',
          font: 'Sarabun',
          cellPadding: { top: 2, right: 1, bottom: 2, left: 1 },
          minCellHeight: 5,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        styles: {
          fontSize: 6,
          cellPadding: { top: 2, right: 1, bottom: 2, left: 1 },
          minCellHeight: 5,
          font: 'Sarabun',
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255],
        },
        columnStyles: hasTraining
          ? {
            0: { halign: 'center', cellWidth: 22 },
            1: { halign: 'right', cellWidth: 28 },
            2: { halign: 'right', cellWidth: 32 },
            3: { halign: 'right', cellWidth: 30 }, // ค่าที่พัก + ค่าอาหาร (ลด 2 จาก 32)
            4: { halign: 'right', cellWidth: 28 }, // งานฝึกอบรม (1 วัน)
            5: { halign: 'right', cellWidth: 20 }, // ค่าแรง (ลด 2 จาก 22)
            6: { halign: 'right', cellWidth: 28, fontStyle: 'bold' }, // รวม
          }
          : {
            0: { halign: 'center', cellWidth: 25 },
            1: { halign: 'right', cellWidth: 30 },
            2: { halign: 'right', cellWidth: 35 },
            3: { halign: 'right', cellWidth: 33 }, // ค่าที่พัก + ค่าอาหาร (ลด 2 จาก 35)
            4: { halign: 'right', cellWidth: 23 }, // ค่าแรง (ลด 2 จาก 25)
            5: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }, // รวม
          },
        margin: { left: 14, right: 14 },
      });

    } else {
      // Default table type (original)
      const tableData = rows.map(row => [
        row.code || '',
        row.type || '',
        row.name || '',
        row.amount || 0,
        row.range === '-' || row.range === null || row.range === undefined ? '-' : row.range,
        // ถ้า parts_total, wage_total, หรือ total เป็น '-' ให้แสดง '-' แทน formatCurrency
        row.parts_total === '-' ? '-' : formatCurrency(row.parts_total || 0),
        row.wage_total === '-' ? '-' : formatCurrency(row.wage_total || 0),
        row.total === '-' ? '-' : formatCurrency(row.total || 0),
      ]);

      // Calculate totals for footer row
      const sumPartsTotal = rows.reduce((sum, row) => sum + (row.parts_total || 0), 0);
      const sumWageTotal = rows.reduce((sum, row) => sum + (row.wage_total || 0), 0);
      const sumTotal = rows.reduce((sum, row) => sum + (row.total || 0), 0);

      // Create footer row with "Total" at position 4 (ระยะ column)
      const footerRow = ['', '', '', '', 'Total', formatCurrency(sumPartsTotal), formatCurrency(sumWageTotal), formatCurrency(sumTotal)];

      autoTable(doc, {
        startY: currentY,
        head: [columns.map(col => col.header)],
        body: tableData,
        foot: [footerRow],
        showFoot: 'lastPage', // Show footer only on last page of the table
        didDrawPage: function (data) {
          // Show table name on continuation pages (pages after the first page of this table)
          const currentPageNum = data.pageNumber;
          if (currentPageNum > tableStartPage) {
            // ตรวจสอบว่าตารางเริ่มที่ตำแหน่งไหนในหน้านี้
            const marginTop = data.settings.margin.top || 20;
            // หัวข้อควรอยู่เหนือตาราง โดยเพิ่มระยะห่างให้เพียงพอ (ประมาณ 15mm)
            // ตารางจะเริ่มที่ marginTop ดังนั้นหัวข้อควรอยู่ที่ marginTop - 15
            const yPos = Math.max(12, marginTop - 15); // อย่างน้อย 12mm จากด้านบน
            doc.setFontSize(9);
            doc.setTextColor(40);
            doc.setFont('Sarabun', 'bold');
            // ใช้ doc.text แบบที่รองรับภาษาไทยดีกว่า
            const tableNameText = tablename || `Table ${index + 1}`;
            doc.text(tableNameText, 14, yPos);

            // เก็บตำแหน่ง startY สำหรับหน้าใหม่ (หัวข้อ + ระยะห่าง 10mm)
            continuationStartY = yPos + 10;
          }
        },
        willDrawCell: function (data) {
          // ปรับ startY ของตารางในหน้าใหม่ให้ต่ำลงเมื่อมีหัวข้อ
          if (continuationStartY !== null && data.pageNumber > tableStartPage) {
            // ถ้าเป็นแถวแรกของตารางในหน้าใหม่ และยังไม่ได้ปรับ startY
            if (data.row.index === 0 && data.column.index === 0) {
              // ตรวจสอบว่า cursor.y ใกล้กับ marginTop มากเกินไป
              if (data.cursor && data.cursor.y !== undefined && data.cursor.y < continuationStartY) {
                data.cursor.y = continuationStartY;
              }
            }
          }
        },
        theme: 'grid',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          font: 'Sarabun',
          cellPadding: { top: 2, right: 1, bottom: 2, left: 1 },
          minCellHeight: 5,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        footStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'right',
          font: 'Sarabun',
          cellPadding: { top: 2, right: 1, bottom: 2, left: 1 },
          minCellHeight: 5,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
        },
        styles: {
          fontSize: 6,
          cellPadding: { top: 2, right: 1, bottom: 2, left: 1 },
          minCellHeight: 5,
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
          1: { halign: 'center', cellWidth: 32 }, // ประเภท (เพิ่มจาก 20)
          2: { halign: 'left', cellWidth: 51 },   // รายการสินค้า
          3: { halign: 'center', cellWidth: 12 }, // จำนวนชิ้น (ลดจาก 20)
          4: { halign: 'center', cellWidth: 15 }, // ระยะ (ลดจาก 18 เพราะตอนนี้เป็น xm.(ym.) ไม่มีช่องว่าง)
          5: { halign: 'right', cellWidth: 19 },  // ค่าของรวม
          6: { halign: 'right', cellWidth: 19 },  // ค่าแรงรวม
          7: { halign: 'right', cellWidth: 23, fontStyle: 'bold' }, // ราคารวม
        },
        margin: { left: 12, right: 12 },
      });
    }

    // Update Y position for next table
    currentY = doc.lastAutoTable.finalY + 8;

    // Add new page if needed and there are more tables
    // ปรับ threshold ให้ใช้หน้ากระดาษได้ดีขึ้น (A4 height = 297mm, margin top/bottom = 20mm, usable = ~257mm)
    if (index < tables.length - 1 && currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
  });

  // Add summary section if provided
  if (jsonData.summary) {
    const summary = jsonData.summary;

    // Check if we need a new page
    // ปรับ threshold ให้ใช้หน้ากระดาษได้ดีขึ้น
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    // ลบคำว่า "สรุป" ออก
    // doc.setFontSize(12); // เพิ่ม 3 size จาก 9
    // doc.setFont('Sarabun', 'bold');
    // doc.text('สรุป', 14, currentY);
    // currentY += 10;

    const pageWidth = doc.internal.pageSize.getWidth();
    const leftX = 14;
    const leftColumnWidth = (pageWidth - 28) * 0.5; // 50% of usable width
    const rightX = leftX + leftColumnWidth + 10; // Right column starts after 50% + spacing
    const startY = currentY;

    doc.setFontSize(10); // เพิ่ม 3 size จาก 7
    doc.setFont('Sarabun', 'normal');
    const lineHeight = 7;

    // Helper function to draw dashed line under text
    const drawDashedUnderline = (x, y, text, fontSize) => {
      const textWidth = doc.getTextWidth(text);
      const dashLength = 1;
      const gapLength = 1;
      let currentX = x;
      doc.setLineWidth(0.1);
      doc.setDrawColor(0, 0, 0);
      while (currentX < x + textWidth) {
        doc.line(currentX, y + 1, Math.min(currentX + dashLength, x + textWidth), y + 1);
        currentX += dashLength + gapLength;
      }
    };

    // Left column
    let leftY = startY;
    const valueFontSize = 10; // เพิ่ม 3 size จาก 7

    // ACCESSORIES = x% = (ค่าที่โชว์ Accessories)
    const accessoriesPercent = summary.accessories_percent || 0; // x%
    const accessoriesText = `ACCESSORIES = ${accessoriesPercent}% = `;
    const accessoriesValue = formatCurrency(summary.accessories_amount || 0);
    doc.text(accessoriesText, leftX, leftY);
    const accessoriesValueX = leftX + doc.getTextWidth(accessoriesText);
    doc.setFontSize(valueFontSize);
    doc.text(accessoriesValue, accessoriesValueX, leftY);
    drawDashedUnderline(accessoriesValueX, leftY, accessoriesValue, valueFontSize);
    doc.setFontSize(10); // เพิ่ม 3 size จาก 7
    leftY += lineHeight;

    // ต้นทุนงานเอกสาร
    const documentText = `ต้นทุนงานเอกสาร = `;
    const documentValue = formatCurrency(summary.document_cost || 0);
    doc.text(documentText, leftX, leftY);
    const documentValueX = leftX + doc.getTextWidth(documentText);
    doc.setFontSize(valueFontSize);
    doc.text(documentValue, documentValueX, leftY);
    drawDashedUnderline(documentValueX, leftY, documentValue, valueFontSize);
    doc.setFontSize(10); // เพิ่ม 3 size จาก 7
    leftY += lineHeight;

    // ค่าเดินทาง = (ค่าเดินทาง + ค่าเดินทางระหว่างที่พัก) + ค่าแรง = ค่าแรง:
    const travelCostWithBetween = (summary.travel_cost || 0) + (summary.travel_between_accommodation || 0);
    const travelText1 = `ค่าเดินทาง = `;
    const travelValue1 = formatCurrency(travelCostWithBetween);
    const travelText2 = ` + ค่าแรง = `;
    const travelValue2 = formatCurrency(summary.travel_labor || 0);
    doc.text(travelText1, leftX, leftY);
    let currentX = leftX + doc.getTextWidth(travelText1);
    doc.setFontSize(valueFontSize);
    doc.text(travelValue1, currentX, leftY);
    drawDashedUnderline(currentX, leftY, travelValue1, valueFontSize);
    doc.setFontSize(10); // เพิ่ม 3 size จาก 7
    currentX += doc.getTextWidth(travelValue1);
    doc.text(travelText2, currentX, leftY);
    currentX += doc.getTextWidth(travelText2);
    doc.setFontSize(valueFontSize);
    doc.text(travelValue2, currentX, leftY);
    drawDashedUnderline(currentX, leftY, travelValue2, valueFontSize);
    doc.setFontSize(10); // เพิ่ม 3 size จาก 7
    leftY += lineHeight;

    // + ค่าที่พัก = ค่าที่พัก + อาหาร: + งานฝึกอบรม (1 วัน): = งานฝึกอบรม (1 วัน):
    const accommodationText1 = `+ ค่าที่พัก = `;
    const accommodationValue1 = formatCurrency(summary.accommodation_food || 0);
    const accommodationText2 = ` + งานฝึกอบรม (1 วัน): = `;
    const accommodationValue2 = formatCurrency(summary.training_cost || 0);
    doc.text(accommodationText1, leftX, leftY);
    currentX = leftX + doc.getTextWidth(accommodationText1);
    doc.setFontSize(valueFontSize);
    doc.text(accommodationValue1, currentX, leftY);
    drawDashedUnderline(currentX, leftY, accommodationValue1, valueFontSize);
    doc.setFontSize(10); // เพิ่ม 3 size จาก 7
    currentX += doc.getTextWidth(accommodationValue1);
    doc.text(accommodationText2, currentX, leftY);
    currentX += doc.getTextWidth(accommodationText2);
    doc.setFontSize(valueFontSize);
    doc.text(accommodationValue2, currentX, leftY);
    drawDashedUnderline(currentX, leftY, accommodationValue2, valueFontSize);
    doc.setFontSize(10); // เพิ่ม 3 size จาก 7
    leftY += lineHeight;

    // = รวมค่าเดินทาง: (ย้ายลงไปอีกบรรทัด)
    const accommodationText3 = `= `;
    const accommodationValue3 = formatCurrency(summary.total_travel_cost || 0);
    doc.text(accommodationText3, leftX, leftY);
    currentX = leftX + doc.getTextWidth(accommodationText3);
    doc.setFontSize(valueFontSize);
    doc.text(accommodationValue3, currentX, leftY);
    drawDashedUnderline(currentX, leftY, accommodationValue3, valueFontSize);
    doc.setFontSize(10); // เพิ่ม 3 size จาก 7
    leftY += lineHeight;

    // Right column
    let rightY = startY;

    // ต้นทุนรวม = ราคารวมสร้างสถานี
    const totalCostText = `ต้นทุนรวม = `;
    const totalCostValue = formatCurrency(summary.total_cost || 0);
    doc.text(totalCostText, rightX, rightY);
    const totalCostValueX = rightX + doc.getTextWidth(totalCostText);
    doc.setFontSize(valueFontSize);
    doc.text(totalCostValue, totalCostValueX, rightY);
    drawDashedUnderline(totalCostValueX, rightY, totalCostValue, valueFontSize);
    doc.setFontSize(10); // เพิ่ม 3 size จาก 7
    rightY += lineHeight;

    // กำไร = x% = จำนวนเงิน (กำไร%)
    const profitText = `กำไร = ${summary.profit_percent || 0}% = `;
    const profitValue = formatCurrency(summary.profit_amount || 0);
    doc.text(profitText, rightX, rightY);
    const profitValueX = rightX + doc.getTextWidth(profitText);
    doc.setFontSize(valueFontSize);
    doc.text(profitValue, profitValueX, rightY);
    drawDashedUnderline(profitValueX, rightY, profitValue, valueFontSize);
    doc.setFontSize(10); // เพิ่ม 3 size จาก 7
    rightY += lineHeight;

    // ต้นทุน + กำไร = ราคารวมสร้างสถานีรวมกำไร
    const costProfitText = `ต้นทุน + กำไร = `;
    const costProfitValue = formatCurrency(summary.cost_and_profit || 0);
    doc.text(costProfitText, rightX, rightY);
    const costProfitValueX = rightX + doc.getTextWidth(costProfitText);
    doc.setFontSize(valueFontSize);
    doc.text(costProfitValue, costProfitValueX, rightY);
    drawDashedUnderline(costProfitValueX, rightY, costProfitValue, valueFontSize);
    doc.setFontSize(10); // เพิ่ม 3 size จาก 7
    rightY += lineHeight;

    // ค่าCom = x% = จำนวนเงิน (CF%)
    const cfText = `ค่าCom = ${summary.cf_percent || 0}% = `;
    const cfValue = formatCurrency(summary.cf_amount || 0);
    doc.text(cfText, rightX, rightY);
    const cfValueX = rightX + doc.getTextWidth(cfText);
    doc.setFontSize(valueFontSize);
    doc.text(cfValue, cfValueX, rightY);
    drawDashedUnderline(cfValueX, rightY, cfValue, valueFontSize);
    doc.setFontSize(10); // เพิ่ม 3 size จาก 7
    rightY += lineHeight;

    // Draw vertical line separator
    const separatorX = leftX + leftColumnWidth + 5;
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(separatorX, startY - 5, separatorX, Math.max(leftY, rightY) + 5);

    // เสนอราคารวม (ย้ายไปฝั่งซ้าย)
    const finalY = Math.max(leftY, rightY) + 10;
    doc.setFont('Sarabun', 'bold');
    doc.setFontSize(12); // เพิ่ม 3 size จาก 9
    const finalOfferText = `เสนอราคารวม = `;
    const finalOfferValue = formatCurrency(summary.final_offer_price || 0);
    doc.text(finalOfferText, leftX, finalY);
    const finalOfferValueX = leftX + doc.getTextWidth(finalOfferText);
    doc.text(finalOfferValue, finalOfferValueX, finalY);
    drawDashedUnderline(finalOfferValueX, finalY, finalOfferValue, 12);

    currentY = finalY + 15;
  }

  // Add signature section
  // วาง signature ในหน้าสุดท้ายเท่านั้น โดยวางให้อยู่เหนือ page number
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageNumberY = pageHeight - 10; // Page number อยู่ที่ 10mm จากขอบล่าง
  const signatureY = pageNumberY - 12; // วาง signature ห่างจาก page number 12mm (ห่างจากขอบล่าง 22mm)

  doc.setFontSize(7);
  doc.setFont('Sarabun', 'normal');
  doc.setTextColor(0, 0, 0);

  const pageWidth = doc.internal.pageSize.getWidth();
  const leftSignX = 30;
  const rightSignX = pageWidth / 2 + 15;

  // วาง signature ในหน้าสุดท้ายเท่านั้น
  const totalPages = doc.internal.getNumberOfPages();
  doc.setPage(totalPages);

  // Left signature: ผู้ทำราคา
  doc.text('ผู้ทำราคา', leftSignX, signatureY);
  doc.line(leftSignX + 25, signatureY, leftSignX + 70, signatureY); // Signature line

  // Right signature: ผู้อนุมัติ
  doc.text('ผู้อนุมัติ', rightSignX, signatureY);
  doc.line(rightSignX + 25, signatureY, rightSignX + 70, signatureY); // Signature line

  // Add page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(5);
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
    prefix = '',
    data1 = '',
    data2 = '',
    data3 = '',
    data4 = '',
    template = null
  } = header;

  // แทนที่ค่าที่ว่างเปล่าด้วย ____________
  const displayPrefix = prefix && prefix.trim() !== '' ? prefix : '____________';
  const displayData1 = data1 && data1.trim() !== '' ? data1 : '____________';
  const displayData2 = data2 && data2.trim() !== '' ? data2 : '____________';
  const displayData3 = data3 && data3.trim() !== '' ? data3 : '____________';
  const displayData4 = data4 && data4.trim() !== '' ? data4 : '____________';

  // If custom template provided, use it
  if (template) {
    return {
      text: template
        .replace('{data1}', displayData1)
        .replace('{data2}', displayData2)
        .replace('{data3}', displayData3)
        .replace('{data4}', displayData4),
      values: [
        { text: displayData1, hasValue: data1 && data1.trim() !== '' },
        { text: displayData2, hasValue: data2 && data2.trim() !== '' },
        { text: displayData3, hasValue: data3 && data3.trim() !== '' },
        { text: displayData4, hasValue: data4 && data4.trim() !== '' }
      ]
    };
  }

  // Default template with new format
  return {
    text: `${displayPrefix}_ใบถอดต้นทุน EV ${displayData1} สถานที่ ${displayData2} พนง.ขาย ${displayData3} วันที่ ${displayData4}`.trim(),
    values: [
      { text: displayPrefix, hasValue: prefix && prefix.trim() !== '' },
      { text: displayData1, hasValue: data1 && data1.trim() !== '' },
      { text: displayData2, hasValue: data2 && data2.trim() !== '' },
      { text: displayData3, hasValue: data3 && data3.trim() !== '' },
      { text: displayData4, hasValue: data4 && data4.trim() !== '' }
    ]
  };
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

  // Helper function to draw dashed underline
  const drawDashedUnderline = (x, y, text, fontSize) => {
    const textWidth = doc.getTextWidth(text);
    const dashLength = 1;
    const gapLength = 1;
    let dashX = x;
    doc.setLineWidth(0.1);
    doc.setDrawColor(0, 0, 0);
    while (dashX < x + textWidth) {
      doc.line(dashX, y + 1, Math.min(dashX + dashLength, x + textWidth), y + 1);
      dashX += dashLength + gapLength;
    }
  };

  // Header
  doc.setFontSize(13); // เพิ่ม 4 size จาก 9
  doc.setFont('Sarabun', 'bold'); // ทำตัวหนา
  doc.setTextColor(40);
  const headerResult = buildHeaderText(header);
  const headerText = headerResult.text || headerResult;
  const headerValues = headerResult.values || [];
  const headerLines = doc.splitTextToSize(headerText, 180);

  // วาด header พร้อมเส้นประใต้ค่าที่มี
  let headerY = 15;
  headerLines.forEach((line, lineIndex) => {
    let lineX = 14;
    let remainingLine = line;

    // แบ่งบรรทัดออกเป็นส่วนๆ เพื่อวาดเส้นประใต้ค่าที่มี
    if (headerValues && headerValues.length > 0) {
      // หาตำแหน่งของแต่ละค่าในบรรทัด
      const valuePositions = [];
      headerValues.forEach((value) => {
        if (value.hasValue && remainingLine.includes(value.text)) {
          const valueIndex = remainingLine.indexOf(value.text);
          if (valueIndex !== -1) {
            valuePositions.push({
              index: valueIndex,
              value: value.text,
              hasValue: true
            });
          }
        }
      });

      // เรียงลำดับตามตำแหน่ง
      valuePositions.sort((a, b) => a.index - b.index);

      // วาดข้อความทีละส่วน
      let currentIndex = 0;
      valuePositions.forEach((pos) => {
        // วาดข้อความก่อนค่า
        if (pos.index > currentIndex) {
          const beforeText = remainingLine.substring(currentIndex, pos.index);
          doc.setFontSize(13);
          doc.setFont('Sarabun', 'bold');
          doc.text(beforeText, lineX, headerY);
          lineX += doc.getTextWidth(beforeText);
        }

        // วาดค่าพร้อมเส้นประ
        doc.setFontSize(13);
        doc.setFont('Sarabun', 'bold');
        doc.text(pos.value, lineX, headerY);
        drawDashedUnderline(lineX, headerY, pos.value, 13);
        lineX += doc.getTextWidth(pos.value);

        currentIndex = pos.index + pos.value.length;
      });

      // วาดข้อความที่เหลือ
      if (currentIndex < remainingLine.length) {
        const afterText = remainingLine.substring(currentIndex);
        doc.setFontSize(13);
        doc.setFont('Sarabun', 'bold');
        doc.text(afterText, lineX, headerY);
      }
    } else {
      // ถ้าไม่มีค่าให้วาดปกติ
      doc.text(line, lineX, headerY);
    }

    headerY += 7;
  });

  // วาดเส้นขีดปิดใต้ header เพื่อแบ่งส่วน
  const headerHeight = headerLines.length * 7;
  const separatorY = 15 + headerHeight + 0.5; // วางเส้นใต้ header ห่าง 0.5mm
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.line(14, separatorY, 196, separatorY); // เส้นเต็มความกว้าง (210mm - 14mm margin)

  // Calculate starting Y position after header
  let currentY = separatorY + 5; // ห่างจากเส้นขีด 5mm

  // Column headers (Thai)
  const columnHeaders = ['รหัส', 'ประเภท', 'รายการสินค้า', 'จำนวนชิ้น', 'ระยะ', 'ค่าของรวม', 'ค่าแรงรวม', 'ราคารวม'];

  // Process each table
  tables.forEach((table, index) => {
    // Table title
    doc.setFontSize(9);
    doc.setFont('Sarabun', 'bold');
    doc.text(table.tablename || `Table ${index + 1}`, 14, currentY);
    currentY += 7;

    // Prepare data
    const tableData = table.rows.map(row => [
      row.code || '',
      row.type || '',
      row.name || '',
      row.amount || 0,
      row.range === '-' || row.range === null || row.range === undefined ? '-' : row.range,
      formatCurrency(row.parts_total || 0),
      formatCurrency(row.wage_total || 0),
      formatCurrency(row.total || 0),
    ]);

    // Calculate totals for footer row
    const sumPartsTotal = table.rows.reduce((sum, row) => sum + (row.parts_total || 0), 0);
    const sumWageTotal = table.rows.reduce((sum, row) => sum + (row.wage_total || 0), 0);
    const sumTotal = table.rows.reduce((sum, row) => sum + (row.total || 0), 0);

    // Create footer row with "Total" at position 4 (ระยะ column)
    const footerRow = ['', '', '', '', 'Total', formatCurrency(sumPartsTotal), formatCurrency(sumWageTotal), formatCurrency(sumTotal)];

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
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        font: 'Sarabun',
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      footStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'right',
        font: 'Sarabun',
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      styles: {
        fontSize: 6,
        cellPadding: 2,
        font: 'Sarabun',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'center', cellWidth: 25 }, // ประเภท (เพิ่มจาก 20)
        2: { halign: 'left', cellWidth: 45 },
        3: { halign: 'center', cellWidth: 17 }, // จำนวนชิ้น (ลดจาก 18)
        4: { halign: 'center', cellWidth: 15 }, // ระยะ (ลดจาก 18 เพราะตอนนี้เป็น xm.(ym.) ไม่มีช่องว่าง)
        5: { halign: 'right', cellWidth: 23 },
        6: { halign: 'right', cellWidth: 23 },
        7: { halign: 'right', cellWidth: 23, fontStyle: 'bold' },
      },
      margin: { left: 12, right: 12 },
    });

    currentY = doc.lastAutoTable.finalY + 15;

    // ปรับ threshold ให้ใช้หน้ากระดาษได้ดีขึ้น
    if (index < tables.length - 1 && currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
  });

  // Page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(5);
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

