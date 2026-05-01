// nfaParser.js (ESM)

import fs from "fs";
import AdmZip from "adm-zip";
import { Parser } from "xml2js";

/* ---------- CORE HELPERS ---------- */

const extractDocumentXML = (filePath) => {
    if (!filePath || !fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const zip = new AdmZip(filePath);
    const entry = zip.getEntry("word/document.xml");

    if (!entry) throw new Error("Invalid DOCX");

    return entry.getData().toString("utf8");
};

const parseXML = async (xml) => {
    const parser = new Parser({ explicitArray: false, ignoreAttrs: true });
    return parser.parseStringPromise(xml);
};

const extractCellText = (cell) => {
    try {
        const paragraphs = cell?.["w:p"];
        if (!paragraphs) return "";

        const pArr = Array.isArray(paragraphs) ? paragraphs : [paragraphs];

        return pArr.map(p => {
            const runs = p?.["w:r"];
            if (!runs) return "";

            const rArr = Array.isArray(runs) ? runs : [runs];

            return rArr.map(r => r?.["w:t"] || "").join("");
        }).join(" ").trim();

    } catch {
        return "";
    }
};

const extractTables = (doc) => {
    // Navigate safely through the XML structure
    const body = doc?.["w:document"]?.["w:body"] || doc?.["document"]?.["body"];
    if (!body) return [];

    let tables = body["w:tbl"] || body["tbl"];
    if (!tables) return [];

    if (!Array.isArray(tables)) tables = [tables];

    return tables.map(tbl => {
        let rows = tbl["w:tr"] || tbl["tr"];
        if (!rows) return [];
        if (!Array.isArray(rows)) rows = [rows];

        return rows.map(row => {
            let cells = row["w:tc"] || row["tc"];
            if (!cells) return [];
            if (!Array.isArray(cells)) cells = [cells];

            return cells.map(cell => extractCellText(cell));
        });
    });
};

const cleanKey = (k) => k.replace(/:/g, "").replace(/\s+/g, " ").trim();

const cleanValue = (v) =>
    v.replace(/\s+/g, " ").replace("USD", "USD ").trim();

/* ---------- TABLE → JSON ---------- */

export const getColumnMapping = (tables) => {
    const data = {};

    tables.forEach(table => {
        table.forEach(row => {
            // Handle rows with 2 or 4 cells (Key: Value or Key: Value | Key: Value)
            for (let i = 0; i < row.length; i += 2) {
                const key = (row[i] || "").trim();
                const val = (row[i + 1] || "").trim();
                if (key && val && key !== "-") {
                    data[cleanKey(key)] = cleanValue(val);
                }
            }
        });
    });

    return data;
};



/* ---------- FINAL TRANSFORMATION ---------- */

const transformData = (raw) => {
    const parseNum = (val) => {
        if (val === undefined || val === null) return null;
        const num = parseFloat(val.toString().replace(/[^0-9.]/g, ''));
        return isNaN(num) ? null : num;
    };

    const parseDate = (val) => {
        if (!val) return null;
        let str = val.toString().trim();
        // Remove 'st', 'nd', 'rd', 'th' after numbers
        str = str.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
        const match = str.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (match) {
            const [_, d, m, y] = match;
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return str;
    };

    return {
        project: raw["Project"] || null,
        itemDescription: raw["Item Description"] || null,
        ntdRefNo: raw["NTD Ref No"] || null,
        nfaDate: parseDate(raw["NFA Date"]),
        indentNo: raw["Indent No"] || null,
        sapPrNo: raw["SAP PR No"] || null,
        wbsNumber: raw["WBS"] ? [raw["WBS"]] : [],

        financials: {
            totalBudget: parseNum(raw["WBS Budget total"]),
            balance: parseNum(raw["WBS Budget balance"]),
            currentNFAValue: parseNum(raw["Value of current NFA"]),
            estimatedBalance: parseNum(raw["Estimate value for balance WBS"])
        }
    };
};


/* ---------- MAIN FUNCTION ---------- */

export const parseNFA = async (filePath) => {
    try {
        const xml = extractDocumentXML(filePath);
        const parsed = await parseXML(xml);
        const tables = extractTables(parsed);

        if (!tables.length) {
            console.warn("[Parser] No tables found in XML");
            throw new Error("No tables found in DOCX");
        }

        const raw = getColumnMapping(tables);
        console.log("[Parser] Raw extracted map:", raw);
        return transformData(raw);
    } catch (err) {
        console.error("[Parser] Execution error:", err.message);
        throw err;
    }
};

/* ---------- CLI RUNNER ---------- */

if (process.argv[1].includes("nfaParser.js")) {
    const file = process.argv[2];

    if (!file) {
        console.log("Usage: node nfaParser.js <file.docx>");
        process.exit(1);
    }

    try {
        const data = await parseNFA(file);
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

//example use case
