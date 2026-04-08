import ExcelJS from 'exceljs';
import prisma from '../utils/db.js';

/**
 * Exports all database tables to a single multi-sheet Excel workbook.
 */
export async function generateFullDatabaseExport() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Procurement System AI';
  workbook.lastModifiedBy = 'Procurement System AI';
  workbook.created = new Date();

  // List of models to export (excluding internal ones like MigrationLog)
  const models = [
    'department',
    'vendor',
    'rfq',
    'rfqVendor',
    'quotation',
    'quotationItem',
    'budgetHead',
    'subClassification',
    'monthlyBudget',
    'pr',
    'prApproval',
    'allocation',
    'wbsMaster',
    'purchaseOrder',
    'poLineItem',
    'shipment',
    'grn',
    'grnLineItem',
    'invoice',
    'invoiceLineItem',
    'threeWayMatch',
    'payment'
  ];

  for (const modelKey of models) {
    try {
      // 1. Fetch all data for this model
      const data = await prisma[modelKey].findMany();
      if (data.length === 0) continue;

      // 2. Create a new worksheet for each table
      // Limit sheet name to 31 chars (Excel limit)
      const sheetName = modelKey.charAt(0).toUpperCase() + modelKey.slice(1);
      const sheet = workbook.addWorksheet(sheetName.substring(0, 31));

      // 3. Define Columns based on first record's keys
      const firstRecord = data[0];
      const columns = Object.keys(firstRecord).map(key => ({
        header: key.toUpperCase(),
        key: key,
        width: 20
      }));
      sheet.columns = columns;

      // 4. Add Rows with slight data formatting
      data.forEach(record => {
        const row = {};
        for (const [key, value] of Object.entries(record)) {
          // Format specific types for Excel
          if (value instanceof Date) {
            row[key] = value;
          } else if (typeof value === 'object' && value !== null) {
            // Handle Json fields or Decimal objects from Prisma
            row[key] = JSON.stringify(value);
          } else {
            row[key] = value;
          }
        }
        sheet.addRow(row);
      });

      // 5. Basic styling
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

    } catch (err) {
      console.error(`Error exporting model ${modelKey}:`, err.message);
    }
  }

  // Generate buffer
  return await workbook.xlsx.writeBuffer();
}
