// poParser.js (ESM)
import XLSX from "xlsx";
import fs from "fs";

/* ---------- HELPERS ---------- */

const cleanText = (text) =>
    typeof text === "string"
        ? text.replace(/\n/g, " ").replace(/\s+/g, " ").trim()
        : text;

const formatDate = (excelDate) => {
    if (!excelDate) return null;
    if (typeof excelDate === "number") {
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return date.toISOString().split("T")[0];
    }
    return excelDate;
};

/* ---------- CORE LOGIC ---------- */

export const parsePO = (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const get = (cell) => sheet[cell]?.v ?? null;

    // 1. Extract Header Info
    const po = {
        poNumber: cleanText(get("L4")),
        date: formatDate(get("K4")),
        vendor: cleanText(get("B9")),

        quotationReference: cleanText(get("B20")),
        quotationDate: formatDate(get("D20")),
        prNumber: cleanText(get("F20")),
        priceBasis: cleanText(get("H20")),
        paymentTerms: cleanText(get("J20")),
        deliveryDate: formatDate(get("L20")),

        items: [],
        total: 0
    };

    // 2. Extract Items Dynamically
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    let startRow = null;

    // Find table header row
    for (let R = range.s.r; R <= range.e.r; R++) {
        let rowValues = [];
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
            rowValues.push(cell?.v);
        }

        if (
            rowValues.some((v) => typeof v === "string" && v.toLowerCase().includes("description")) &&
            rowValues.some((v) => typeof v === "string" && v.toLowerCase().includes("qty"))
        ) {
            startRow = R + 1;
            console.log(`[Parser] Found header at row ${R + 1}:`, rowValues.filter(v => v));
            break;
        }
    }

    // 3. Extract Item Rows
    if (startRow !== null) {
        for (let R = startRow; R <= range.e.r; R++) {
            const sno = sheet[XLSX.utils.encode_cell({ r: R, c: 1 })]?.v; // Col B
            const desc = sheet[XLSX.utils.encode_cell({ r: R, c: 2 })]?.v; // Col C

            if (!desc || desc.toString().toLowerCase().includes("total")) break;
            if (!sno && !desc) continue;

            const parseVal = (val) => {
                if (val === undefined || val === null) return 0;
                if (typeof val === "number") return val;
                const num = parseFloat(val.toString().replace(/[^0-9.]/g, ''));
                return isNaN(num) ? 0 : num;
            };

            const qty = parseVal(sheet[XLSX.utils.encode_cell({ r: R, c: 9 })]?.v);    // Col J
            const rate = parseVal(sheet[XLSX.utils.encode_cell({ r: R, c: 10 })]?.v);  // Col K
            const amount = parseVal(sheet[XLSX.utils.encode_cell({ r: R, c: 11 })]?.v); // Col L

            po.items.push({
                sno: cleanText(sno),
                description: cleanText(desc),
                qty,
                rate,
                amount
            });

            po.total += amount;
        }
    }

    // 4. Basic Validation
    if (!po.poNumber) throw new Error("Invalid PO: PO Number missing in cell L4");
    if (!po.vendor) throw new Error("Invalid PO: Vendor missing in cell B9");

    return po;
};

/* ---------- CLI RUNNER ---------- */

if (process.argv[1]?.includes("poParser.js")) {
    const file = process.argv[2];
    if (!file) {
        console.log("Usage: node poParser.js <file.xlsx>");
        process.exit(1);
    }

    try {
        const data = parsePO(file);
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

export default parsePO;

