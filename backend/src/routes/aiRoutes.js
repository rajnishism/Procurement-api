import express from 'express';
import multer from 'multer';
import { extractQuotationDetails, exportPRExcel } from '../controllers/aiController.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { fileFilter } from '../utils/fileUploadSecurity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure a local temp directory exists for uploads
const uploadDir = path.join(__dirname, '../../uploads/tmp');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure an output directory exists for Excel generation
const outputDir = path.join(__dirname, '../../uploads/output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Set up storage for incoming files
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `AI-TMP-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
const router = express.Router();

// POST /api/ai/extract - handles file part and calls controllers
router.post('/extract', upload.single('file'), extractQuotationDetails);

// POST /api/ai/export - handles final PR Data for Excel generation
router.post('/export', exportPRExcel);

export default router;
