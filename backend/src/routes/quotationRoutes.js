import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import { getQuotationByToken, submitQuotation, getQuotationsByPr } from '../controllers/quotationController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Upload directory: backend/uploads/quotations/
const uploadDir = path.join(__dirname, '../../uploads/quotations');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `QUO-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});

import { fileFilter } from '../utils/fileUploadSecurity.js';

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB per file
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.zip') return cb(null, true);
        fileFilter(req, file, cb);
    },
});

const router = express.Router();

// GET /api/quotations/respond/:token — load vendor portal data
router.get('/respond/:token', getQuotationByToken);

// POST /api/quotations/respond/:token — vendor submits quotation (multipart/form-data)
router.post('/respond/:token', upload.array('attachments', 5), submitQuotation);

// GET /api/quotations/pr/:prId — list all vendor quotations received for a PR
router.get('/pr/:prId', getQuotationsByPr);

export default router;
