import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates a Purchase Requisition (PR) Excel file by filling the custom template.
 * @param {Object} prData - The structured AI extraction merged with user metadata.
 * @param {Array} approvals - Optional approval history.
 * @param {string} targetDir - Optional specific directory to save the file.
 * @returns {string} - The path to the newly generated Excel file.
 */
export async function generateExcelPR(prData, approvals = [], targetDir = null) {
    const workbook = new ExcelJS.Workbook();

    // Path to the provided PR template
    const templatePath = path.join(__dirname, '../../files/templates/template_pr.xlsx');
    const outputDir = targetDir || path.join(__dirname, '../../uploads/output');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Load the template
    await workbook.xlsx.readFile(templatePath);
    const sheet = workbook.getWorksheet('PR'); // Targeting the specific 'PR' sheet

    if (!sheet) {
        console.error("Sheet named 'PR' not found in template. Reverting to first sheet.");
    }
    const targetSheet = sheet || workbook.getWorksheet(1);

    // Force every cell in the entire sheet to have a white background and black text
    targetSheet.eachRow({ includeEmpty: true }, (row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFFFF' }
            };
            cell.font = {
                color: { argb: 'FF000000' },
                name: 'Calibri',
                size: 10
            };
        });
    });

    // 1. Fill Header Section
    targetSheet.getRow(6).getCell(1).value = "INDENT NO: " + prData.indentNo || '';
    targetSheet.getRow(6).getCell(4).value = "DEPT: " + prData.department || '';
    targetSheet.getRow(6).getCell(8).value = prData.date || new Date().toISOString().split('T')[0];

    // 2. Fill Main Item in Table (Row 9 ONLY)
    // Instead of listing all items, we focus only on the Main Item
    const mainItem = prData.main_item;
    const grandTotal = prData.grand_total;

    if (mainItem) {
        const row = targetSheet.getRow(9);

        // Populate Main Item Details
        row.getCell(1).value = 1;                              // A: S.No
        row.getCell(2).value = mainItem.description || '';     // B: ITEM DESCRIPTION
        row.getCell(3).value = mainItem.size || '';            // C: SIZE
        row.getCell(4).value = mainItem.specification || '';   // D: SPECIFICATION
        row.getCell(5).value = mainItem.unit || 'Nos';         // E: UOM
        row.getCell(6).value = mainItem.quantity || 1;         // F: REQUIREMENT
        row.getCell(7).value = 0;                              // G: STOCK IN HAND
        row.getCell(8).value = mainItem.quantity || 1;         // H: TO BUY
        row.getCell(9).value = prData.items?.[0]?.area || '';  // I: Area of Utilization
        row.getCell(10).value = prData.ros || 'Immediate';     // J: R.O.S
        row.getCell(11).value = grandTotal;                    // K: Est. Value (Main Item + Supporting)
        row.getCell(12).value = prData.items?.[0]?.wbs || '';  // L: WBS

        // Style the row
        for (let i = 1; i <= 12; i++) {
            row.getCell(i).border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        }
    }

    const grandTotalCell = targetSheet.getRow(17).getCell(12);
    grandTotalCell.value = grandTotal;
    grandTotalCell.font = { bold: true, color: { argb: 'FF000000' }, size: 11 };
    grandTotalCell.alignment = { horizontal: 'right' };

    // 4. Digital Signatures & Role Names
    // Positions: Indentor (B24:C25), Verifier (E24:G25), Approver (I24:K25)
    const signaturePositions = {
        'INDENTOR': { col: 2, row: 21, range: 'B21:B22' },
        'STAGE1': { col: 2, row: 21, range: 'B21:B22' }, // PR Approver
        'STAGE2': { col: 9, row: 24, range: 'I24:K26' }, // Verifier (re-using or adding space)
        'STAGE3': { col: 11, row: 24, range: 'L24:M26' } // Final Approver
    };

    for (const app of approvals) {
        if (!app.approver) continue;

        const pos = signaturePositions[app.role];
        if (!pos) continue;

        // Name
        const nameCell = targetSheet.getRow(pos.row + 3).getCell(pos.col);
        nameCell.value = app.approver.name || app.approver.email;
        nameCell.font = { bold: true, size: 9 };
        nameCell.alignment = { horizontal: 'center' };

        // Signature Image (Only if APPROVED)
        if (app.status === 'APPROVED' && app.approver.signaturePath) {
            const sigPath = path.join(__dirname, '../../uploads/signatures', app.approver.signaturePath);
            if (fs.existsSync(sigPath)) {
                try {
                    const ext = path.extname(sigPath).slice(1) || 'png';
                    const imageId = workbook.addImage({
                        filename: sigPath,
                        extension: ext === 'jpg' ? 'jpeg' : ext,
                    });
                    targetSheet.addImage(imageId, pos.range);
                } catch (imgErr) {
                    console.error(`Failed to embed signature for ${app.approver.email}:`, imgErr.message);
                }
            }
        }
    }

    // Save with a unique name
    const timestamp = Date.now();
    const fileName = `PR-${prData.indentNo ? prData.indentNo.replace(/\//g, '-') : timestamp}.xlsx`;
    const outputPath = path.join(outputDir, fileName);
    await workbook.xlsx.writeFile(outputPath);

    console.log(`Excel generation successful for INDENT: ${prData.indentNo} at ${outputPath}`);
    return outputPath;
}

/**
 * Updates an existing Excel file with new values and potentially an image.
 * Handles merged cells correctly by always writing to the master (top-left) cell.
 *
 * @param {string} filePath - Absolute path to the existing Excel file.
 * @param {Array}  updates  - Array of update objects:
 *   { type: 'text',  cell: 'A6',       value: 'Hello', bold: false }
 *   { type: 'image', range: 'B21:B22', imagePath: '/abs/path/sig.png' }
 */
export async function updateExcelFile(filePath, updates = []) {
    const workbook = new ExcelJS.Workbook();
    if (!fs.existsSync(filePath)) throw new Error(`[updateExcelFile] File not found: ${filePath}`);

    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet('PR') || workbook.getWorksheet(1);

    if (!sheet) throw new Error('[updateExcelFile] Could not find worksheet');

    for (const update of updates) {
        if (update.type === 'text' && update.cell) {
            // ── Merged-cell safe write ──
            // ExcelJS represents merged cells differently: the non-master cells
            // in a merge return a cell whose .type === Cell.Types.Merge (6).
            // Writing .value on those is silently ignored by Excel.
            // We resolve to the master cell before writing.
            let cell = sheet.getCell(update.cell);

            // If the cell is part of a merge, getCell returns the master cell directly
            // when you access via address. But to be safe, check model.master:
            if (cell.type === 6 /* ExcelJS Merge type */ && cell.master) {
                cell = cell.master;
            }

            console.log(`[updateExcelFile] Writing "${update.value}" → cell ${cell.address} (requested: ${update.cell})`);
            cell.value = update.value;
            cell.font = {
                name: cell.font?.name || 'Calibri',
                size: cell.font?.size || 10,
                bold: update.bold !== undefined ? update.bold : (cell.font?.bold || false),
                color: { argb: 'FF000000' }
            };
        }
        else if (update.type === 'image' && update.range && update.imagePath) {
            if (fs.existsSync(update.imagePath)) {
                try {
                    const ext = path.extname(update.imagePath).replace('.', '').toLowerCase() || 'png';
                    const imageId = workbook.addImage({
                        filename: update.imagePath,
                        extension: (ext === 'jpg' || ext === 'jpeg') ? 'jpeg' : 'png',
                    });
                    sheet.addImage(imageId, update.range);
                    console.log(`[updateExcelFile] Image embedded in range ${update.range}`);
                } catch (imgErr) {
                    console.error(`[updateExcelFile] Image embed failed for range ${update.range}:`, imgErr.message);
                }
            } else {
                console.warn(`[updateExcelFile] Image file not found, skipping: ${update.imagePath}`);
            }
        }
    }

    await workbook.xlsx.writeFile(filePath);
    console.log(`[updateExcelFile] File saved: ${filePath}`);
    return filePath;
}