import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getApprovers, createApprover, deleteApprover, updateApprover, getApproverByEmail } from '../controllers/approverController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads/signatures directory exists
const signatureDir = path.join(__dirname, '../../uploads/signatures');
if (!fs.existsSync(signatureDir)) {
    fs.mkdirSync(signatureDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, signatureDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `SIG-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });

const router = express.Router();

router.get('/', getApprovers);
router.get('/email/:email', getApproverByEmail);
router.post('/', createApprover);
router.put('/:id', upload.single('signature'), updateApprover);
router.delete('/:id', deleteApprover);

export default router;
