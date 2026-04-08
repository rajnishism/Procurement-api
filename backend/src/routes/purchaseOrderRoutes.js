import express from 'express';
import { 
    createPO, 
    getPOs, 
    getPOById, 
    issuePO, 
    acknowledgePO, 
    cancelPO,
    generatePOExcel
} from '../controllers/poController.js';
import { 
    sendPoApprovalRequest, 
    getPoApprovalByToken, 
    submitPoApproval, 
    getPoApprovals 
} from '../controllers/poApprovalController.js';

const router = express.Router();

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

// Approval Sub-Resource
router.get('/:id/approvals', getPoApprovals);
router.post('/:id/submit', sendPoApprovalRequest);

export default router;
