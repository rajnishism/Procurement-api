import express from 'express';
import { 
    getPoApprovalByToken, 
    submitPoApproval,
    sendPoApprovalRequest,
    getPoApprovals
} from '../controllers/poApprovalController.js';

const router = express.Router();

router.post('/send', sendPoApprovalRequest);
router.get('/po/:poId', getPoApprovals);

// Public Token-based Actions for MD Approval
router.get('/actions/:token', getPoApprovalByToken);
router.post('/actions/:token', submitPoApproval);

export default router;
