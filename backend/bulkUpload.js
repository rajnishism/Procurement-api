// bulkUpload.js — Standalone NFA bulk importer (ESM)
// Usage: node bulkUpload.js
// Place .docx files inside backend/bulk_files/ before running.

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import prisma from './src/utils/db.js';
import * as storageService from './src/services/storageService.js';
import { parseNFA } from './src/services/nfaParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BULK_FOLDER = path.join(__dirname, 'bulk_files');

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

const generateNfaNumber = async () => {
    const count = await prisma.nfa.count();
    return `NFA-${String(count + 1).padStart(4, '0')}`;
};

/* ─── Process one file ───────────────────────────────────────────────────────── */

async function processFile(fileName, index, total) {
    const filePath = path.join(BULK_FOLDER, fileName);

    try {
        const stat = await fsPromises.lstat(filePath);
        if (!stat.isFile()) return;

        console.log(`\n📄 [${index + 1}/${total}] Processing: ${fileName}`);

        // 1. Parse NFA fields from the document
        let parsed = {};
        try {
            parsed = await parseNFA(filePath);
            console.log(`   ✔ Parsed fields:`, Object.keys(parsed).filter(k => parsed[k]).join(', ') || 'none');
        } catch (parseErr) {
            console.warn(`   ⚠ Parser failed (${parseErr.message}), using empty fields.`);
        }

        // 2. Generate NFA number
        const nfaNumber = await generateNfaNumber();

        // 3. Copy file into the NFA storage folder
        const nfaDir = storageService.getNfaDir(nfaNumber);
        storageService.ensureDir(nfaDir);

        let documentPath = null;
        try {
            const destPath = path.join(nfaDir, fileName);
            fs.copyFileSync(filePath, destPath);
            documentPath = fileName;
            console.log(`   ✔ Copied → ${destPath}`);
        } catch (copyErr) {
            console.warn(`   ⚠ File copy failed: ${copyErr.message}`);
        }

        // 4. Write to DB
        const nfa = await prisma.nfa.create({
            data: {
                nfaNumber,
                project:          parsed.project          || `Bulk Import — ${fileName}`,
                itemDescription:  parsed.itemDescription  || fileName,
                ntdRefNo:         parsed.ntdRefNo         || null,
                nfaDate:          parsed.nfaDate ? new Date(parsed.nfaDate) : new Date(),
                indentNo:         parsed.indentNo         || null,
                sapPrNo:          parsed.sapPrNo          || null,
                wbsNumber:        Array.isArray(parsed.wbsNumber) ? parsed.wbsNumber : [],
                totalBudget:      parsed.financials?.totalBudget      ? Number(parsed.financials.totalBudget)      : null,
                balance:          parsed.financials?.balance          ? Number(parsed.financials.balance)          : null,
                currentNFAValue:  parsed.financials?.currentNFAValue  ? Number(parsed.financials.currentNFAValue)  : null,
                estimatedBalance: parsed.financials?.estimatedBalance ? Number(parsed.financials.estimatedBalance) : null,
                documentPath,
                status:           'DRAFT',
                createdById:      null,   // no authenticated user in a script context
            },
        });

        console.log(`   ✅ Created ${nfa.nfaNumber} — DB id: ${nfa.id}`);

    } catch (err) {
        console.error(`   ❌ Failed: ${fileName}`, err.message);
    }
}

/* ─── Main ───────────────────────────────────────────────────────────────────── */

async function run() {
    try {
        // Check folder exists
        if (!fs.existsSync(BULK_FOLDER)) {
            console.error(`❌  Bulk folder not found: ${BULK_FOLDER}`);
            console.error(`   Create the folder and place .docx files inside it, then re-run.`);
            process.exit(1);
        }

        const files = (await fsPromises.readdir(BULK_FOLDER))
            .filter(f => !f.startsWith('.')); // skip hidden/system files

        if (files.length === 0) {
            console.warn('⚠  No files found in bulk_files/. Nothing to import.');
            process.exit(0);
        }

        console.log(`🚀 Starting bulk upload of ${files.length} file(s)...\n`);

        for (let i = 0; i < files.length; i++) {
            await processFile(files[i], i, files.length);
        }

        console.log('\n🎉 Bulk upload completed');
    } catch (err) {
        console.error('❌  Script failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

run();