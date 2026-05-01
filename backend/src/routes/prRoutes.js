import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { uploadPr, createPr, getPrs, getPrById, deletePr, saveAiPr, updatePr, updatePrExcel } from '../controllers/prController.js';
import { getPrApprovals } from '../controllers/approvalController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../../uploads/pdfs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `PR-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

import { fileFilter } from '../utils/fileUploadSecurity.js';

const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit for PR documents
});
const router = express.Router();

// --- PURCHASE REQUISITIONS (PR) ---

// Core CRUD
router.get('/', getPrs);                // GET /api/prs
router.post('/', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'additionalFiles', maxCount: 10 }]), saveAiPr);
router.get('/:id', getPrById);         // GET /api/prs/:id
router.patch('/:id', updatePr);        // PATCH /api/prs/:id
router.delete('/:id', deletePr);      // DELETE /api/prs/:id

// Transitions
router.post('/:id/submit', (req, res) => res.json({ msg: "PR submitted for approval" })); // Placeholder for workflow lock

// Sub-Resources
router.get('/:id/approvals', getPrApprovals); // GET /api/prs/:id/approvals

// External Integration / Attachments
router.post('/upload', upload.single('file'), uploadPr); // Legacy for legacy file-first upload
router.put('/:id/excel', updatePrExcel); 

export default router;
