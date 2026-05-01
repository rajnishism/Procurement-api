import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import prisma from '../utils/db.js';
import { getNfas, getNfaById, createNfa, parseNfaDocument } from '../controllers/nfaController.js';
import * as storageService from '../services/storageService.js';

const execAsync = promisify(exec);

const router = express.Router();

// ── Directories ──────────────────────────────────────────────────────────────
const tempDir = storageService.getTempDir();
[tempDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tempDir),
    filename: (_req, file, cb) => cb(null, `NFA-TMP-${Date.now()}-${file.originalname}`),
});

import { fileFilter } from '../utils/fileUploadSecurity.js';

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ── LibreOffice path (same as exportExcelToPdf.js) ────────────────────────────
const LIBRE_OFFICE = process.env.LIBRE_OFFICE_PATH
    || '/Applications/LibreOffice.app/Contents/MacOS/soffice';

// ── Helper: DOCX/DOC → PDF via LibreOffice ───────────────────────────────────
async function convertToPdf(inputPath, outDir) {
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const pdfPath = path.join(outDir, `${fileName}.pdf`);

    // Skip conversion if a cached copy exists that is newer than the source
    if (fs.existsSync(pdfPath)) {
        const srcMtime = fs.statSync(inputPath).mtimeMs;
        const pdfMtime = fs.statSync(pdfPath).mtimeMs;
        if (pdfMtime >= srcMtime) return pdfPath;
    }

    const cmd = `"${LIBRE_OFFICE}" --headless --convert-to "pdf:writer_pdf_Export" --outdir "${outDir}" "${inputPath}"`;
    await execAsync(cmd);

    if (!fs.existsSync(pdfPath)) throw new Error('LibreOffice did not produce a PDF');
    return pdfPath;
}

// ── GET /api/nfas/:id/preview-pdf ─────────────────────────────────────────────
router.get('/:id/preview-pdf', async (req, res) => {
    try {
        const nfa = await prisma.nfa.findUnique({ where: { id: req.params.id } });
        if (!nfa || !nfa.documentPath) {
            return res.status(404).json({ message: 'NFA or document not found' });
        }

        // documentPath is now relative to uploads/ (e.g. NFA-0001/versions/NFA-0001_approval-note_v1_2026-04-11.docx)
        const storedFile = storageService.resolveUploadPath(nfa.documentPath);

        if (!fs.existsSync(storedFile)) {
            return res.status(404).json({ message: `Document file not found on disk: ${nfa.documentPath}` });
        }

        const ext = path.extname(nfa.documentPath).toLowerCase();

        // ── Already a PDF → stream it directly ──────────────────────────────
        if (ext === '.pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${path.basename(storedFile)}"`);
            return fs.createReadStream(storedFile).pipe(res);
        }

        // ── Word document → convert into entity preview/ folder then stream ──
        if (['.doc', '.docx'].includes(ext)) {
            const entityPreviewDir = storageService.getPreviewDir(storageService.getNfaDir(nfa.nfaNumber));
            storageService.ensureDir(entityPreviewDir);
            const pdfPath = await convertToPdf(storedFile, entityPreviewDir);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${path.basename(pdfPath)}"`);
            return fs.createReadStream(pdfPath).pipe(res);
        }

        // ── Unsupported type ─────────────────────────────────────────────────
        return res.status(415).json({
            message: `Preview is not supported for file type: ${ext}`,
        });

    } catch (err) {
        console.error('[NFA Preview] Error:', err.message);
        return res.status(500).json({ message: 'Failed to generate preview', error: err.message });
    }
});

// ── Core CRUD routes ──────────────────────────────────────────────────────────
router.get('/', getNfas);
router.post('/parse', upload.single('document'), parseNfaDocument);
router.post('/', upload.single('document'), createNfa);
router.get('/:id', getNfaById);

export default router;
