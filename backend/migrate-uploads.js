/**
 * migrate-uploads.js
 *
 * One-time migration: reorganises the uploads/ directory to the new standard.
 *
 * For each PR / PO / NFA entity:
 *   - Creates  versions/ attachments/ preview/ sub-folders
 *   - Renames files to the canonical convention
 *   - Updates the database paths
 *
 * Cleans up orphaned folders: pdfs/ output/ tmp/ quotations/ nfa-previews/
 * and stale files in temp/.
 *
 * Usage:
 *   node migrate-uploads.js --dry-run   ← preview only, no changes
 *   node migrate-uploads.js             ← live run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const prisma    = new PrismaClient();
const UPLOADS   = path.join(__dirname, 'uploads');
const DRY_RUN   = process.argv.includes('--dry-run');

// ── helpers ──────────────────────────────────────────────────────────────────

const sanitize = (n) => n.replace(/\//g, '-');

/** YYYY-MM-DD from a Date object (or today if falsy). */
const dateStr = (d) =>
    d ? new Date(d).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

/** Canonical file name: ENTITY_description_vN_YYYY-MM-DD.ext */
const canonical = (entity, desc, v, ext, date) =>
    `${sanitize(entity)}_${desc}_v${v}_${date}${ext.toLowerCase()}`;

const relToUploads = (abs) => path.relative(UPLOADS, abs);

function ensureDir(d) {
    if (!DRY_RUN && !fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

/**
 * Move src → dest.
 * In dry-run mode just prints; never overwrites.
 * Returns the new relative path (for DB) or null.
 */
function moveFile(src, dest) {
    if (!fs.existsSync(src)) {
        log(`  ⚠️  SKIP (not found): ${relToUploads(src)}`);
        return null;
    }
    if (fs.existsSync(dest) && src !== dest) {
        log(`  ⚠️  SKIP (dest exists): ${relToUploads(dest)}`);
        return relToUploads(dest); // still return new path so DB gets updated
    }
    if (DRY_RUN) {
        log(`  🔍 MOVE  ${relToUploads(src)}`);
        log(`       →  ${relToUploads(dest)}`);
        return relToUploads(dest);
    }
    ensureDir(path.dirname(dest));
    fs.renameSync(src, dest);
    log(`  ✅ MOVED ${relToUploads(src)} → ${relToUploads(dest)}`);
    return relToUploads(dest);
}

/** Copy src → dest (used when one preview file serves multiple entities). */
function copyFile(src, dest) {
    if (!fs.existsSync(src)) return null;
    if (DRY_RUN) {
        log(`  🔍 COPY  ${relToUploads(src)} → ${relToUploads(dest)}`);
        return relToUploads(dest);
    }
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    log(`  ✅ COPY  ${relToUploads(src)} → ${relToUploads(dest)}`);
    return relToUploads(dest);
}

function log(msg) { console.log(msg); }

async function dbUpdate(model, id, data) {
    if (DRY_RUN) {
        log(`  🔍 DB    UPDATE ${model} id=${id} → ${JSON.stringify(data)}`);
        return;
    }
    await prisma[model].update({ where: { id }, data });
    log(`  ✅ DB    ${model} id=${id} updated`);
}

// ── PR migration ──────────────────────────────────────────────────────────────

async function migratePRs() {
    log('\n══════════════════════════════════════');
    log('  PRs');
    log('══════════════════════════════════════');

    const prs = await prisma.pr.findMany({
        select: { id: true, prNumber: true, pdfPath: true, excelPath: true, templatePdfPath: true, prDate: true }
    });

    for (const pr of prs) {
        // Skip records with no files at all
        if (!pr.pdfPath && !pr.excelPath && !pr.templatePdfPath) continue;

        const date      = dateStr(pr.prDate);
        const entity    = sanitize(pr.prNumber);
        const entityDir = path.join(UPLOADS, 'prs', entity);

        if (!fs.existsSync(entityDir)) {
            log(`\n[PR ${pr.prNumber}] ⚠️  Folder not found: ${relToUploads(entityDir)} — skipping`);
            continue;
        }

        log(`\n[PR ${pr.prNumber}]`);

        const versionsDir    = path.join(entityDir, 'versions');
        const attachmentsDir = path.join(entityDir, 'attachments');
        const previewDir     = path.join(entityDir, 'preview');
        ensureDir(versionsDir);
        ensureDir(attachmentsDir);
        ensureDir(previewDir);

        const updates = {};

        // ── Excel → versions/ ────────────────────────────────────────────────
        if (pr.excelPath) {
            const src  = path.join(entityDir, path.basename(pr.excelPath));
            const name = canonical(pr.prNumber, 'indent-form', 1, '.xlsx', date);
            const dest = path.join(versionsDir, name);
            const rel  = moveFile(src, dest);
            if (rel) updates.excelPath = rel;
        }

        // ── PDF proxy → preview/preview_main.pdf ─────────────────────────────
        if (pr.templatePdfPath) {
            const src  = path.join(entityDir, path.basename(pr.templatePdfPath));
            const dest = path.join(previewDir, 'preview_main.pdf');
            const rel  = moveFile(src, dest);
            if (rel) updates.templatePdfPath = rel;
        }

        // ── Source quote → attachments/ ───────────────────────────────────────
        if (pr.pdfPath) {
            const src  = path.join(entityDir, path.basename(pr.pdfPath));
            const ext  = path.extname(pr.pdfPath).toLowerCase() || '.pdf';
            const name = canonical(pr.prNumber, 'vendor-quote', 1, ext, date);
            const dest = path.join(attachmentsDir, name);
            const rel  = moveFile(src, dest);
            if (rel) updates.pdfPath = rel;
        }

        if (Object.keys(updates).length) await dbUpdate('pr', pr.id, updates);
    }
}

// ── NFA migration ─────────────────────────────────────────────────────────────

async function migrateNFAs() {
    log('\n══════════════════════════════════════');
    log('  NFAs');
    log('══════════════════════════════════════');

    const nfas = await prisma.nfa.findMany({
        select: { id: true, nfaNumber: true, documentPath: true, nfaDate: true }
    });

    for (const nfa of nfas) {
        if (!nfa.documentPath) continue;

        const date      = dateStr(nfa.nfaDate);
        const entityDir = path.join(UPLOADS, 'nfas', nfa.nfaNumber);

        if (!fs.existsSync(entityDir)) {
            log(`\n[NFA ${nfa.nfaNumber}] ⚠️  Folder not found — skipping`);
            continue;
        }

        log(`\n[NFA ${nfa.nfaNumber}]`);

        const versionsDir = path.join(entityDir, 'versions');
        const previewDir  = path.join(entityDir, 'preview');
        ensureDir(versionsDir);
        ensureDir(path.join(entityDir, 'attachments'));
        ensureDir(previewDir);

        const updates = {};

        // ── Document → versions/ ─────────────────────────────────────────────
        const docSrc  = path.join(entityDir, path.basename(nfa.documentPath));
        const ext     = path.extname(nfa.documentPath).toLowerCase() || '.docx';
        const docName = canonical(nfa.nfaNumber, 'approval-note', 1, ext, date);
        const docDest = path.join(versionsDir, docName);
        const rel     = moveFile(docSrc, docDest);
        if (rel) updates.documentPath = rel;

        // ── Preview from nfa-previews/ → preview/preview_main.pdf ────────────
        const origBase    = path.basename(nfa.documentPath, path.extname(nfa.documentPath));
        const oldPreview  = path.join(UPLOADS, 'nfa-previews', `${origBase}.pdf`);
        const newPreview  = path.join(previewDir, 'preview_main.pdf');
        // Use copyFile — multiple NFAs may share the same source preview
        copyFile(oldPreview, newPreview);

        if (Object.keys(updates).length) await dbUpdate('nfa', nfa.id, updates);
    }
}

// ── PO migration ──────────────────────────────────────────────────────────────

async function migratePOs() {
    log('\n══════════════════════════════════════');
    log('  POs');
    log('══════════════════════════════════════');

    const pos = await prisma.purchaseOrder.findMany({
        select: { id: true, poNumber: true, excelPath: true, templatePdfPath: true, createdAt: true }
    });

    for (const po of pos) {
        if (!po.excelPath && !po.templatePdfPath) continue;

        const date      = dateStr(po.createdAt);
        const entity    = sanitize(po.poNumber);
        const entityDir = path.join(UPLOADS, 'pos', entity);

        if (!fs.existsSync(entityDir)) {
            log(`\n[PO ${po.poNumber}] ⚠️  Folder not found — skipping`);
            continue;
        }

        log(`\n[PO ${po.poNumber}]`);

        const versionsDir = path.join(entityDir, 'versions');
        const previewDir  = path.join(entityDir, 'preview');
        ensureDir(versionsDir);
        ensureDir(path.join(entityDir, 'attachments'));
        ensureDir(previewDir);

        const updates = {};

        // ── Excel → versions/ ────────────────────────────────────────────────
        if (po.excelPath) {
            const src  = path.join(entityDir, path.basename(po.excelPath));
            const name = canonical(po.poNumber, 'purchase-order', 1, '.xlsx', date);
            const dest = path.join(versionsDir, name);
            const rel  = moveFile(src, dest);
            if (rel) updates.excelPath = rel;
        }

        // ── PDF proxy → preview/preview_main.pdf ─────────────────────────────
        if (po.templatePdfPath) {
            const src  = path.join(entityDir, path.basename(po.templatePdfPath));
            const dest = path.join(previewDir, 'preview_main.pdf');
            const rel  = moveFile(src, dest);
            if (rel) updates.templatePdfPath = rel;
        }

        if (Object.keys(updates).length) await dbUpdate('purchaseOrder', po.id, updates);
    }
}

// ── Cleanup orphaned folders / stale files ────────────────────────────────────

async function cleanup() {
    log('\n══════════════════════════════════════');
    log('  Cleanup');
    log('══════════════════════════════════════');

    // Completely orphaned folders — no DB references
    const orphanDirs = ['output', 'tmp', 'quotations'];
    for (const dir of orphanDirs) {
        const full = path.join(UPLOADS, dir);
        if (!fs.existsSync(full)) continue;
        if (DRY_RUN) {
            log(`  🔍 DELETE folder: ${dir}/`);
        } else {
            fs.rmSync(full, { recursive: true, force: true });
            log(`  ✅ DELETED folder: ${dir}/`);
        }
    }

    // nfa-previews/ — after all previews have been copied into entity folders
    const nfaPreviews = path.join(UPLOADS, 'nfa-previews');
    if (fs.existsSync(nfaPreviews)) {
        if (DRY_RUN) {
            log(`  🔍 DELETE folder: nfa-previews/`);
        } else {
            fs.rmSync(nfaPreviews, { recursive: true, force: true });
            log(`  ✅ DELETED folder: nfa-previews/`);
        }
    }

    // pdfs/ — all files here are orphaned (active PR records already have
    // their quotes in entity folders, bulk-import PRs have null pdfPath)
    const pdfsDir = path.join(UPLOADS, 'pdfs');
    if (fs.existsSync(pdfsDir)) {
        if (DRY_RUN) {
            log(`  🔍 DELETE folder: pdfs/  (${fs.readdirSync(pdfsDir).length} orphaned files)`);
        } else {
            fs.rmSync(pdfsDir, { recursive: true, force: true });
            log(`  ✅ DELETED folder: pdfs/`);
        }
    }

    // temp/ — delete stale files older than 24 h
    const tempDir = path.join(UPLOADS, 'temp');
    if (fs.existsSync(tempDir)) {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const files  = fs.readdirSync(tempDir);
        let   count  = 0;
        for (const f of files) {
            const full = path.join(tempDir, f);
            if (fs.statSync(full).mtimeMs < cutoff) {
                if (DRY_RUN) {
                    log(`  🔍 DELETE stale temp: ${f}`);
                } else {
                    fs.unlinkSync(full);
                    count++;
                }
            }
        }
        if (!DRY_RUN && count) log(`  ✅ Deleted ${count} stale temp files`);
    }
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
    log('');
    log('╔══════════════════════════════════════╗');
    log('║     Upload Migration Script          ║');
    log(`║  Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)    ' : '⚡ LIVE (writing to disk+DB)'}║`);
    log('╚══════════════════════════════════════╝');

    try {
        await migratePRs();
        await migrateNFAs();
        await migratePOs();
        await cleanup();
        log('\n✅ Migration complete.\n');
    } catch (err) {
        log(`\n❌ Migration failed: ${err.message}`);
        console.error(err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
