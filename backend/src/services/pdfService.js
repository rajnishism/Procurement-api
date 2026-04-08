import { createRequire } from 'module';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
const execPromise = promisify(exec);

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

// ──────────────────────────────────────────────────────────────────────────────
// COORDINATE-BASED TEMPLATE EXTRACTION
// Fixed pixel regions calibrated for the Mesabi Metallics PR template at 300dpi.
// If template changes, only the `regions` array needs updating.
// ──────────────────────────────────────────────────────────────────────────────

const TEMPLATE_REGIONS = [
    { name: 'indentNo', x: 240, y: 200, w: 600, h: 50 },
    { name: 'date', x: 2350, y: 200, w: 400, h: 50 },
    { name: 'department', x: 850, y: 200, w: 600, h: 50 },
    { name: 'wbsCode', x: 3200, y: 900, w: 200, h: 300 },
    { name: 'indentor', x: 220, y: 2000, w: 600, h: 100 },
    { name: 'verifiedBy', x: 1100, y: 2000, w: 600, h: 100 },
    { name: 'approver', x: 2600, y: 2000, w: 600, h: 100 },
    { name: 'itemDescription', x: 50, y: 433, w: 510, h: 1220 },

];

/**
 * Crop a region from an image and run Tesseract OCR on it.
 * Returns a clean single-line string.
 */
const ocrRegion = async (imagePath, region, cropPath) => {
    try {
        const originalImage = sharp(imagePath);
        const metadata = await originalImage.metadata();

        const left = Math.max(0, region.x);
        const top = Math.max(0, region.y);
        const width = Math.min(region.w, metadata.width - left);
        const height = Math.min(region.h, metadata.height - top);

        if (width <= 0 || height <= 0 || left >= metadata.width || top >= metadata.height) {
            console.warn(`  [SKIP] Region '${region.name}' is outside image bounds.`);
            return '';
        }

        await originalImage
            .extract({ left, top, width, height })
            .toFile(cropPath);

        const result = await Tesseract.recognize(cropPath, 'eng');
        return result.data.text.replace(/\s+/g, ' ').trim();
    } catch (err) {
        console.warn(`  [WARN] OCR failed for region '${region.name}':`, err.message);
        return '';
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// LINE-ITEM TABLE EXTRACTION  (kept from original — works well from raw text)
// Uses pdf-parse's geometric renderer to read item rows from the table.
// ──────────────────────────────────────────────────────────────────────────────

const extractLineItems = async (filePath) => {
    const buffer = fs.readFileSync(filePath);
    const render_page = async (pageData) => {
        const textContent = await pageData.getTextContent({
            normalizeWhitespace: false,
            disableCombineTextItems: false
        });

        let items = textContent.items.map(item => ({
            text: item.str,
            x: item.transform[4],
            y: item.transform[5],
        }));

        items.sort((a, b) => {
            const yDiff = b.y - a.y;
            if (Math.abs(yDiff) > 5) return yDiff;
            return a.x - b.x;
        });

        const lines = [];
        let currentLine = [];
        let currentY = null;

        items.forEach(item => {
            if (currentY === null || Math.abs(currentY - item.y) > 5) {
                if (currentLine.length > 0) lines.push(currentLine);
                currentLine = [item];
                currentY = item.y;
            } else {
                currentLine.push(item);
                currentY = (currentY + item.y) / 2;
            }
        });
        if (currentLine.length > 0) lines.push(currentLine);

        return lines.map(line => {
            line.sort((a, b) => a.x - b.x);
            return line.map(i => i.text.trim()).filter(Boolean).join('\t');
        }).join('\n');
    };

    const data = await pdfParse(buffer, { pagerender: render_page });
    const text = data.text;

    const textLines = text.split('\n').map(l => l.trim());
    const lineItems = textLines
        .filter(line => /^\d+\.?\s+/.test(line))
        .map(line => {
            const parts = line.split(/\s{2,}|\t/);
            if (parts.length >= 2) {
                return {
                    sNo: parts[0].replace('.', '').trim(),
                    description: parts[1],
                    estValue: parts[parts.length - 1].trim()
                };
            }
            return null;
        })
        .filter(item => item !== null);

    // Parse total from text
    const totalAnchor = text.match(/(?:Total|Grand\s*Total|TOTAL)\s*[\$]?\s*([\d,]+\.?\d*)/i);
    let totalValue = 0;
    if (totalAnchor) {
        totalValue = parseFloat(totalAnchor[1].replace(/[,\s]/g, ''));
    } else if (lineItems.length > 0) {
        totalValue = lineItems.reduce((sum, item) => {
            const val = parseFloat((item.estValue || '0').replace(/[\$,\s]/g, ''));
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
    }

    return { lineItems, totalValue, rawText: text };
};


// ──────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT  — called by prController with the saved file path from multer diskStorage
// ──────────────────────────────────────────────────────────────────────────────

export const parsePrPdf = async (filePath) => {
    console.log('--- STARTING COORDINATE-BASED PR EXTRACTION ---');
    console.log('  Source file:', filePath);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-pdf-'));
    const imgPrefix = path.join(tmpDir, 'page');
    const imgPath = `${imgPrefix}-1.png`;
    const croppedPaths = [];

    try {
        // 1. Convert first page to high-res PNG (use the saved file directly)
        await execPromise(`pdftocairo -png -f 1 -l 1 -r 300 "${filePath}" "${imgPrefix}"`);

        if (!fs.existsSync(imgPath)) {
            throw new Error(`pdftocairo did not produce image at ${imgPath}`);
        }

        // 3. OCR each fixed region in parallel
        console.log('Running OCR on template regions...');
        const ocrResults = {};

        await Promise.all(TEMPLATE_REGIONS.map(async (region, idx) => {
            const cropPath = path.join(tmpDir, `crop-${idx}.png`);
            croppedPaths.push(cropPath);
            ocrResults[region.name] = await ocrRegion(imgPath, region, cropPath);
            console.log(`  [${region.name.toUpperCase()}] -> "${ocrResults[region.name]}"`);
        }));

        // 4. Build description as clean multi-line text (real \n between each item row)
        //    and lineItems as a simple array of { sNo, text } for table rendering.
        const buildItemsFromOcr = (rawOcrText) => {
            if (!rawOcrText) return { description: '', lineItems: [] };

            // Clean each line: strip leading/trailing whitespace, drop blank lines
            const cleanLines = rawOcrText
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 0);

            // Store as newline-separated string — preserves visual order from the PDF
            const description = cleanLines.join('\n');

            // Build structured lineItems only for lines that start with a serial number
            const lineItems = cleanLines
                .filter(l => /^\d+\.?\s+\S/.test(l))
                .map(line => {
                    const m = line.match(/^(\d+)\.?\s+(.+)$/);
                    return m ? { sNo: m[1], text: m[2].trim() } : null;
                })
                .filter(Boolean);

            return { description, lineItems };
        };

        const { description: ocrDescription, lineItems: ocrLineItems } =
            buildItemsFromOcr(ocrResults.itemDescription);

        // Fall back to pdf-parse items if OCR gave nothing
        const { lineItems: pdfLineItems, totalValue, rawText } = await extractLineItems(filePath);
        const finalLineItems = ocrLineItems.length > 0 ? ocrLineItems : pdfLineItems;
        const finalDescription = ocrDescription || pdfLineItems.map(i => `${i.sNo}. ${i.description}`).join('\n') || 'No Items Detected';

        console.log(`  [ITEMS] ${finalLineItems.length} rows | description has ${finalDescription.split('\n').length} lines`);

        // 5. Build final structured object
        const finalData = {
            prNumber: ocrResults.indentNo || null,
            indentNo: ocrResults.indentNo || null,
            date: ocrResults.date || null,
            department: ocrResults.department || null,
            wbsCode: ocrResults.wbsCode ? ocrResults.wbsCode.replace(/\s+/g, ' ').trim() : null,
            approver: ocrResults.approver || null,
            indentor: ocrResults.indentor || null,
            verifiedBy: ocrResults.verifiedBy || null,
            totalValue,
            lineItems: finalLineItems,
            description: finalDescription,   // stored with real \n characters
        };

        console.log('--- EXTRACTION COMPLETE ---');
        return { ...finalData, rawText };

    } catch (error) {
        console.error('Extraction Error:', error);
        throw new Error('Failed to extract PR data: ' + error.message);
    } finally {
        // Only clean up temp OCR files — the original PDF in uploads/pdfs/ must be kept
        try {
            [imgPath, ...croppedPaths].forEach(p => {
                if (fs.existsSync(p)) fs.unlinkSync(p);
            });
            fs.rmdirSync(tmpDir);
        } catch (_) { /* ignore cleanup errors */ }
    }
};
