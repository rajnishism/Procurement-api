import fs from "fs";
import AdmZip from "adm-zip";
import { Parser } from "xml2js";

const extractDocumentXML = (filePath) => {
    const zip = new AdmZip(filePath);
    const entry = zip.getEntry("word/document.xml");
    return entry.getData().toString("utf8");
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
    } catch { return ""; }
};

const extractTables = (doc) => {
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

async function debug() {
    const xml = extractDocumentXML('NFA.docx');
    const parser = new Parser({ explicitArray: false, ignoreAttrs: true });
    const parsed = await parser.parseStringPromise(xml);
    const tables = extractTables(parsed);
    console.log('Tables found:', tables.length);
    tables.forEach((t, i) => {
        console.log(`Table ${i} row 0:`, t[0]);
        console.log(`Table ${i} row 1:`, t[1]);
    });
}

debug();
