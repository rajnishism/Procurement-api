import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import {
  createApprovalRequest,
  getMyApprovals,
  getApprovalRequestById,
  submitApprovalAction,
  getAllApprovalRequests,
} from '../controllers/inAppApprovalController.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/in-approvals/my  → steps pending for the logged-in user
router.get('/my', getMyApprovals);

// GET /api/in-approvals     → admin: all requests
router.get('/', authorize('ADMIN', 'MANAGER'), getAllApprovalRequests);

// POST /api/in-approvals    → create a new approval request + steps
router.post('/', createApprovalRequest);

// GET /api/in-approvals/:id → single request detail (all users who are approvers)
router.get('/:id', getApprovalRequestById);

// POST /api/in-approvals/:id/action → logged-in user approves or rejects
router.post('/:id/action', submitApprovalAction);

export default router;
