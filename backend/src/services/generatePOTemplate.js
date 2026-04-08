import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates a Purchase Order Excel file.
 * Fills all cells with solid white color and clears dynamic red-fill rules.
 */
export async function generateExcelPO(poData, targetDir = null) {
    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(__dirname, '../../files/templates/PO_Template.xlsx');
    const outputDir = targetDir || path.join(__dirname, '../../uploads/output');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    if (!fs.existsSync(templatePath)) throw new Error(`PO Template not found.`);

    await workbook.xlsx.readFile(templatePath);
    const sheet = workbook.getWorksheet('PO') || workbook.getWorksheet(1);
    if (!sheet) throw new Error("Worksheet not found.");

    // ── ⚪ FILL ALL CELLS WITH WHITE & STRIP CONDITIONAL RULES ──────────
    // 1. Remove the rules that turn cells red automatically
    if (sheet.conditionalFormattings) {
        sheet.conditionalFormattings = [];
    }

    // 2. Explicitly fill every cell with solid white to clear any remaining colors
    sheet.eachRow({ includeEmpty: true }, (row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFFFF' } // Pure White
            };
        });
    });

    const toExcelDate = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d;
    };

    const writeCell = (cellRef, value) => {
        try {
            let cell = sheet.getCell(cellRef);
            if (cell.type === 6 && cell.master) {
                cell = cell.master;
            }
            cell.value = value || null;
        } catch (err) {
            console.warn(`[generateExcelPO] Warning writing to ${cellRef}:`, err.message);
        }
    };

    // ─── 🔑 HEADER SECTION ────────────────────────────────────────────────
    writeCell('L4', poData.po_number);
    writeCell('K4', toExcelDate(poData.po_date));
    writeCell('B9', poData.vendor_details);
    writeCell('I9', poData.shipping_address);

    // ─── 📄 REFERENCE & COMMERCIAL DETAILS ───────────────────────────────
    writeCell('B20', poData.quotation_reference);
    writeCell('D20', toExcelDate(poData.quotation_date));
    writeCell('F20', poData.pr_reference || poData.pr_number);
    writeCell('H20', poData.price_basis);
    writeCell('J20', poData.payment_terms);
    writeCell('L20', toExcelDate(poData.delivery_date));

    // ─── 📊 LINE ITEMS TABLE (ROW 22+) ──────────────────────────────────
    const itemStartRow = 22;
    const items = poData.po_items || [];

    items.forEach((item, idx) => {
        const rowNum = itemStartRow + idx;
        writeCell(`B${rowNum}`, idx + 1);
        writeCell(`C${rowNum}`, item.description);
        writeCell(`I${rowNum}`, item.unit);
        writeCell(`J${rowNum}`, item.quantity > 0 ? item.quantity : null);
        writeCell(`K${rowNum}`, item.rate > 0 ? item.rate : null);
        const amount = (item.quantity || 0) * (item.rate || 0);
        writeCell(`L${rowNum}`, amount > 0 ? amount : null);
    });

    // ─── 💰 TOTAL & SIGNATURE ────────────────────────────────────────────
    writeCell('L34', poData.total_amount > 0 ? poData.total_amount : null);
    writeCell('B33', poData.signature);

    // ─── SAVE OUTPUT ────────────────────────────────────────────────────
    const safePO = (poData.po_number || `PO-${Date.now()}`).replace(/[^a-zA-Z0-9-]/g, '_');
    const outputPath = path.join(outputDir, `${safePO}.xlsx`);
    await workbook.xlsx.writeFile(outputPath);

    return outputPath;
}
