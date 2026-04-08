import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { excelToPDF } from './exportExcelToPdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates SR (Service Request) Excel file
 */
export async function generateExcelSR(srData, targetDir = null) {
    const workbook = new ExcelJS.Workbook();

    const templatePath = path.join(__dirname, '../../files/templates/SR_Template.xlsx');
    const outputDir = targetDir || path.join(__dirname, '../../uploads/output');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    if (!fs.existsSync(templatePath)) throw new Error(`SR Template not found.`);

    await workbook.xlsx.readFile(templatePath);
    const sheet = workbook.getWorksheet('SR') || workbook.getWorksheet(1);
    if (!sheet) throw new Error("Worksheet not found.");

    // ── ⚪ CLEAR FORMATTING (same as PO) ───────────────────────────────
    if (sheet.conditionalFormattings) {
        sheet.conditionalFormattings = [];
    }

    sheet.eachRow({ includeEmpty: true }, (row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFFFF' }
            };
        });
    });

    // ─── 📅 DATE HELPER ────────────────────────────────────────────────
    const toExcelDate = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d;
    };

    // ─── ✍️ SAFE CELL WRITER ───────────────────────────────────────────
    const writeCell = (cellRef, value) => {
        try {
            let cell = sheet.getCell(cellRef);
            if (cell.type === 6 && cell.master) {
                cell = cell.master;
            }
            cell.value = value || null;
        } catch (err) {
            console.warn(`[generateExcelSR] Warning writing to ${cellRef}:`, err.message);
        }
    };

    // ─── 🔑 SR HEADER FIELDS ───────────────────────────────────────────
    writeCell('G5', srData.request_number);
    writeCell('V5', toExcelDate(srData.request_date));

    writeCell('G7', srData.area_manager);
    writeCell('V7', srData.project_head);

    writeCell('G9', srData.location_of_work);

    // Work Period
    writeCell('I11', toExcelDate(srData.work_start_date));
    writeCell('O11', toExcelDate(srData.work_end_date));

    writeCell('W11', srData.amend_to);

    // ─── 📝 DESCRIPTION & JUSTIFICATION ───────────────────────────────
    writeCell('G13', srData.work_description);
    writeCell('G16', srData.justification);

    // ─── 📄 REFERENCE DETAILS ─────────────────────────────────────────
    writeCell('G20', srData.work_order_no);
    writeCell('Q20', srData.ammend_no);
    writeCell('V20', srData.work_order_amount);


    // ─── 👤 APPROVAL SECTION ──────────────────────────────────────────
    writeCell('A52', srData.requisitioner);
    writeCell('L52', srData.recommended_by);
    writeCell('U52', srData.approved_by);

    // ─── 💾 SAVE FILE ─────────────────────────────────────────────────
    const safeSR = (srData.request_number || `SR-${Date.now()}`)
        .replace(/[^a-zA-Z0-9-]/g, '_');

    const outputPath = path.join(outputDir, `${safeSR}.xlsx`);

    await workbook.xlsx.writeFile(outputPath);

    return outputPath;
}

// example use case
const srData = {
    request_number: "SR-TEST-001",
    request_date: "2026-04-08",

    area_manager: "Rajnish Kumar",
    project_head: "Amit Sharma",

    location_of_work: "Mumbai Site",

    work_start_date: "2026-04-10",
    work_end_date: "2026-04-20",

    amend_to: "SR-OLD-123",

    work_description: "Testing Excel automation for SR template",
    justification: "To validate backend Excel generation logic",

    work_order_no: "WO-999",
    ammend_no: "AM-123",
    work_order_amount: "100000",

    requisitioner: "Rajnish",
    recommended_by: "Manager A",
    approved_by: "Director B"
};

const filePath = await generateExcelSR(srData);
// 🔥 THIS is the correct file
const pdfPath = await excelToPDF(filePath, 'backend/uploads/output');

console.log("✅ SR Excel Generated Successfully!");
console.log("📁 File Location:", filePath);