import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { extractQuotationDetails, exportPRExcel } from '../controllers/aiController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../../uploads/tmp');
const outputDir = path.join(__dirname, '../../uploads/output');

[uploadDir, outputDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `DOC-PRO-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });
const router = express.Router();

// Document Extractions (AI Powered)
router.post('/extractions', upload.single('file'), extractQuotationDetails);

// Document Exports (Generating templates)
router.post('/exports', exportPRExcel);

export default router;
