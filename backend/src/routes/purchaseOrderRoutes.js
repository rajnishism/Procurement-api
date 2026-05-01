import express from 'express';
import { 
    createPO, 
    getPOs, 
    getPOById, 
    issuePO, 
    acknowledgePO, 
    cancelPO,
    generatePOExcel,
    parsePOFile
} from '../controllers/poController.js';
import { 
    sendPoApprovalRequest, 
    getPoApprovalByToken, 
    submitPoApproval, 
    getPoApprovals 
} from '../controllers/poApprovalController.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// --- UPLOAD CONFIG ---
const tempDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tempDir),
    filename: (_req, file, cb) => cb(null, `PO-PARSE-${Date.now()}-${file.originalname}`),
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// --- PURCHASE ORDERS (PO) ---

// Core CRUD
router.get('/', getPOs);              // GET /api/purchase-orders
router.post('/', createPO);           // POST /api/purchase-orders
router.get('/:id', getPOById);       // GET /api/purchase-orders/:id

// Document Generation
router.post('/generate-excel', generatePOExcel); // POST /api/purchase-orders/generate-excel

// Status Transitions
router.patch('/:id/issue', issuePO);
router.patch('/:id/acknowledge', acknowledgePO);
router.patch('/:id/cancel', cancelPO);

// Parsing
router.post('/parse', upload.single('document'), parsePOFile);

// Approval Sub-Resource
router.get('/:id/approvals', getPoApprovals);
router.post('/:id/submit', sendPoApprovalRequest);

export default router;
