import express from 'express';
import { sendApprovalRequests, getApprovalByToken, submitApproval, getPrApprovals } from '../controllers/approvalController.js';

const router = express.Router();

// --- CENTRAL APPROVAL ENGINE ---

// Core Token Actions (Used for Email Links)
router.get('/actions/:token', getApprovalByToken);   // GET /api/approvals/actions/:token
router.post('/actions/:token', submitApproval);     // POST /api/approvals/actions/:token

// Triggers
router.post('/send', sendApprovalRequests);          // POST /api/approvals/send

export default router;
