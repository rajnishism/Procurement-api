import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

// Helper to get or create entity directory
const getPrDir = (prNumber) => {
    const sanitized = prNumber.replace(/\//g, '-');
    const dir = path.join(uploadsDir, 'prs', sanitized);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
};

const getPoDir = (poNumber) => {
    const sanitized = poNumber.replace(/\//g, '-');
    const dir = path.join(uploadsDir, 'pos', sanitized);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
};

const moveFile = (oldPath, newPath) => {
    if (fs.existsSync(oldPath)) {
        try {
            // If destination exists, maybe don't overwrite or handle it
            if (fs.existsSync(newPath)) {
                console.log(`[SKIP] Destination already exists: ${newPath}`);
                return true;
            }
            fs.renameSync(oldPath, newPath);
            console.log(`[MOVE] ${oldPath} -> ${newPath}`);
            return true;
        } catch (err) {
            console.error(`[ERROR] Failed to move ${oldPath}:`, err.message);
            return false;
        }
    }
    return false;
};

async function migrate() {
    console.log('--- Starting Storage Migration ---');

    // 1. Migrate PRs
    const prs = await prisma.pr.findMany({
        include: { techSpec: true }
    });

    for (const pr of prs) {
        const prDir = getPrDir(pr.prNumber);
        let updates = {};

        // Migrate pdfPath (Source Quotation)
        if (pr.pdfPath) {
            const filename = path.basename(pr.pdfPath);
            const oldPaths = [
                path.join(uploadsDir, 'quotations', filename),
                path.join(uploadsDir, 'pdfs', filename),
                path.join(uploadsDir, 'temp', filename)
            ];

            for (const oldPath of oldPaths) {
                if (moveFile(oldPath, path.join(prDir, filename))) {
                    updates.pdfPath = filename;
                    break;
                }
            }
        }

        // Migrate excelPath (Generated PR)
        if (pr.excelPath) {
            const filename = path.basename(pr.excelPath);
            const oldPath = path.join(uploadsDir, 'output', filename);
            if (moveFile(oldPath, path.join(prDir, filename))) {
                updates.excelPath = filename;
            }
        }

        // Migrate techSpec
        if (pr.techSpec && pr.techSpec.filePath) {
            const filename = path.basename(pr.techSpec.filePath);
            const oldPath = path.join(uploadsDir, 'tech-specs', filename);
            if (moveFile(oldPath, path.join(prDir, filename))) {
                await prisma.technicalSpecification.update({
                    where: { id: pr.techSpec.id },
                    data: { filePath: filename }
                });
            }
        }

        if (Object.keys(updates).length > 0) {
            await prisma.pr.update({
                where: { id: pr.id },
                data: updates
            });
        }
    }

    // 3. Migrate Quotation Attachments
    console.log("Step 3: Migrating Vendor Quotation Attachments...");
    const quotations = await prisma.quotation.findMany({
        include: { rfq: { include: { pr: true } } }
    });

    for (const q of quotations) {
        if (!q.attachments) continue;
        const prNumber = q.rfq.pr.prNumber;
        const prDir = getPrDir(prNumber);
        const sanitizedPr = prNumber.replace(/\//g, '-');
        
        let attachments = JSON.parse(q.attachments);
        let updated = false;

        for (const att of attachments) {
            const filename = att.filename;
            const oldPath = path.join(uploadsDir, 'quotations', filename);
            const newRelativePath = `uploads/prs/${sanitizedPr}/${filename}`;
            
            if (moveFile(oldPath, path.join(prDir, filename))) {
                att.path = newRelativePath;
                updated = true;
            }
        }

        if (updated) {
            await prisma.quotation.update({
                where: { id: q.id },
                data: { attachments: JSON.stringify(attachments) }
            });
        }
    }

    // 4. Cleanup Empty Legacy Directories
    const legacyDirs = ['quotations', 'pdfs', 'output', 'tech-specs', 'temp'];
    for (const dirName of legacyDirs) {
        const fullPath = path.join(uploadsDir, dirName);
        if (fs.existsSync(fullPath)) {
            const files = fs.readdirSync(fullPath);
            if (files.length === 0) {
                fs.rmdirSync(fullPath);
                console.log(`[CLEANUP] Removed empty directory: ${dirName}`);
            } else {
                console.log(`[CLEANUP] Directory NOT empty, skipping: ${dirName} (${files.length} files)`);
            }
        }
    }

    console.log('--- Migration Finished ---');
}

migrate()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
