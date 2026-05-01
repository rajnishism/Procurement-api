/**
 * storageService.js
 *
 * Central file management service.
 *
 * Naming Convention (uniform for PR / PO / NFA):
 *   {ENTITY}-{ID}_{description}_v{version}_{YYYY-MM-DD}.{ext}
 *   e.g.  PR-0001_indent-form_v1_2026-04-11.xlsx
 *         PO-0001_purchase-order_v1_2026-04-15.pdf
 *         NFA-0001_approval-note_v1_2026-04-16.docx
 *
 * Actual folder layout:
 *   uploads/
 *     prs/
 *       PR-0001/
 *         versions/        ← main document versions (v1, v2 …)
 *         attachments/     ← supporting docs (quotes, specs …)
 *         preview/         ← preview PDFs (never the originals)
 *     pos/
 *       PO-0001/ …
 *     nfas/
 *       NFA-0001/ …
 *     temp/                ← multer staging area (transient)
 *
 * Design rule:
 *   Typed root-dir functions (getPrDir / getPoDir / getNfaDir) return the
 *   correct entity base directory including the type prefix (prs/ pos/ nfas/).
 *   All sub-folder and operation helpers accept that base directory directly —
 *   they never infer the type themselves.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

// ─── LOW-LEVEL HELPERS ────────────────────────────────────────────────────────

/** Creates a directory (and all parents) if it does not yet exist. */
export const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    return dirPath;
};

/** Sanitises an entity number for use as a folder / file name segment. */
const sanitise = (n) => n.replace(/\//g, '-');

// ─── DATE HELPER ─────────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD (used in canonical file names). */
export const today = () => new Date().toISOString().slice(0, 10);

// ─── NAMING CONVENTION ───────────────────────────────────────────────────────

/**
 * Builds a canonical file name.
 * @param {string} entityLabel  e.g. "PR-0001"  (sanitised, no slashes)
 * @param {string} description  e.g. "indent-form"
 * @param {number} version      e.g. 1
 * @param {string} ext          e.g. ".xlsx"  (with leading dot)
 * @param {string} [date]       e.g. "2026-04-11"  (defaults to today)
 * @returns {string}            e.g. "PR-0001_indent-form_v1_2026-04-11.xlsx"
 */
export const buildFileName = (entityLabel, description, version, ext, date) => {
    const d       = date || today();
    const safeDesc = description.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    return `${sanitise(entityLabel)}_${safeDesc}_v${version}_${d}${ext.toLowerCase()}`;
};

/**
 * Builds the preview filename for an attachment.
 * e.g. "PR-0001_quote_v1_2026-04-12.pdf" → "PR-0001_quote_v1_2026-04-12_preview.pdf"
 */
export const buildPreviewFileName = (originalFileName) => {
    const ext  = path.extname(originalFileName);
    const base = originalFileName.slice(0, originalFileName.length - ext.length);
    return `${base}_preview.pdf`;
};

// ─── TYPED ROOT-DIR FUNCTIONS (source of truth) ───────────────────────────────

/** Full path to the PR entity directory: uploads/prs/{sanitised prNumber}/ */
export const getPrDir  = (prNumber)  => path.join(UPLOADS_ROOT, 'prs',  sanitise(prNumber));

/** Full path to the PO entity directory: uploads/pos/{sanitised poNumber}/ */
export const getPoDir  = (poNumber)  => path.join(UPLOADS_ROOT, 'pos',  sanitise(poNumber));

/** Full path to the NFA entity directory: uploads/nfas/{nfaNumber}/ */
export const getNfaDir = (nfaNumber) => path.join(UPLOADS_ROOT, 'nfas', sanitise(nfaNumber));

/** Temp staging directory. */
export const getTempDir = () => path.join(UPLOADS_ROOT, 'temp');

// ─── SUB-FOLDER HELPERS (accept a baseDir) ────────────────────────────────────

/** versions/ sub-folder for the given entity base directory. */
export const getVersionsDir    = (baseDir) => path.join(baseDir, 'versions');

/** attachments/ sub-folder for the given entity base directory. */
export const getAttachmentsDir = (baseDir) => path.join(baseDir, 'attachments');

/** preview/ sub-folder for the given entity base directory. */
export const getPreviewDir     = (baseDir) => path.join(baseDir, 'preview');

// ─── DIRECTORY INITIALISATION ─────────────────────────────────────────────────

/**
 * Ensures all standard sub-directories exist for an entity.
 * Pass the typed base dir: getPrDir() / getPoDir() / getNfaDir().
 *
 * @param {string} baseDir  e.g. result of getPrDir(prNumber)
 * @returns {{ root, versions, attachments, preview }}
 */
export const ensureEntityDirs = (baseDir) => {
    const dirs = {
        root:        baseDir,
        versions:    getVersionsDir(baseDir),
        attachments: getAttachmentsDir(baseDir),
        preview:     getPreviewDir(baseDir),
    };
    Object.values(dirs).forEach(ensureDir);
    return dirs;
};

// ─── FILE OPERATIONS ─────────────────────────────────────────────────────────

/**
 * Moves a file into the entity's versions/ folder (main documents).
 * @param {string} sourcePath     Full path of the temp file.
 * @param {string} baseDir        Entity base dir (from getPrDir / getNfaDir / getPoDir).
 * @param {string} targetFileName Canonical name (use buildFileName()).
 * @returns {string|null}         Path relative to uploads/ for DB storage.
 */
export const moveToVersions = (sourcePath, baseDir, targetFileName) =>
    _moveFile(sourcePath, getVersionsDir(baseDir), targetFileName);

/**
 * Moves a file into the entity's attachments/ folder (supporting docs).
 * @param {string} sourcePath     Full path of the temp file.
 * @param {string} baseDir        Entity base dir.
 * @param {string} targetFileName Canonical name.
 * @returns {string|null}         Path relative to uploads/ for DB storage.
 */
export const moveToAttachments = (sourcePath, baseDir, targetFileName) =>
    _moveFile(sourcePath, getAttachmentsDir(baseDir), targetFileName);

/**
 * Saves (or replaces) a preview PDF in the entity's preview/ folder.
 * Preview files are the ONLY files that may be overwritten.
 *
 * For main document → targetFileName = "preview_main.pdf"
 * For attachments   → targetFileName = buildPreviewFileName(originalName)
 *
 * @param {string} sourcePath     Full path to the converted preview PDF.
 * @param {string} baseDir        Entity base dir.
 * @param {string} targetFileName e.g. "preview_main.pdf"
 * @returns {string|null}         Path relative to uploads/ for DB storage.
 */
export const savePreview = (sourcePath, baseDir, targetFileName) => {
    const previewDir = getPreviewDir(baseDir);
    ensureDir(previewDir);
    const destination = path.join(previewDir, targetFileName);

    if (!fs.existsSync(sourcePath)) {
        console.warn(`[StorageService] Preview source not found: ${sourcePath}`);
        return null;
    }
    try {
        fs.copyFileSync(sourcePath, destination);
        console.log(`[StorageService] Preview saved: ${destination}`);
        return path.relative(UPLOADS_ROOT, destination);
    } catch (error) {
        console.error(`[StorageService] Failed to save preview:`, error.message);
        return null;
    }
};

/**
 * Resolves a relative path (as stored in DB) to a full filesystem path.
 */
export const resolveUploadPath = (relativePath) => path.join(UPLOADS_ROOT, relativePath);

// ─── VERSIONING ───────────────────────────────────────────────────────────────

/**
 * Returns the next version number by scanning versions/ in the given baseDir.
 * @param {string} baseDir  Entity base dir.
 * @returns {number}        Next version number (1 if no versions exist yet).
 */
export const nextVersion = (baseDir) => {
    const versionsDir = getVersionsDir(baseDir);
    if (!fs.existsSync(versionsDir)) return 1;
    let max = 0;
    for (const f of fs.readdirSync(versionsDir)) {
        const m = f.match(/_v(\d+)_/);
        if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return max + 1;
};

// ─── LEGACY (kept for old call-sites not yet updated) ─────────────────────────

/**
 * @deprecated Use moveToVersions() or moveToAttachments() with the typed base dir.
 * Moves a file into the entity root folder (no sub-folder).
 */
export const moveToEntityFolder = (sourcePath, entityType, entityNumber, targetFileName) => {
    if (!fs.existsSync(sourcePath)) {
        console.warn(`[StorageService] Source file not found: ${sourcePath}`);
        return null;
    }
    let baseDir;
    switch (entityType.toUpperCase()) {
        case 'PR':  baseDir = getPrDir(entityNumber);  break;
        case 'PO':  baseDir = getPoDir(entityNumber);  break;
        case 'NFA': baseDir = getNfaDir(entityNumber); break;
        default:    baseDir = path.join(UPLOADS_ROOT, entityType.toLowerCase(), sanitise(entityNumber));
    }
    ensureDir(baseDir);
    const destination = path.join(baseDir, targetFileName);
    try {
        fs.renameSync(sourcePath, destination);
        console.log(`[StorageService] Moved file to: ${destination}`);
        return path.relative(UPLOADS_ROOT, destination);
    } catch (error) {
        console.error(`[StorageService] Failed to move file:`, error.message);
        return null;
    }
};

// ─── INTERNAL ────────────────────────────────────────────────────────────────

function _moveFile(sourcePath, targetDir, targetFileName) {
    if (!fs.existsSync(sourcePath)) {
        console.warn(`[StorageService] Source file not found: ${sourcePath}`);
        return null;
    }
    ensureDir(targetDir);
    const destination = path.join(targetDir, targetFileName);
    try {
        fs.renameSync(sourcePath, destination);
        console.log(`[StorageService] Moved → ${destination}`);
        return path.relative(UPLOADS_ROOT, destination);
    } catch (error) {
        console.error(`[StorageService] Failed to move file:`, error.message);
        return null;
    }
}
