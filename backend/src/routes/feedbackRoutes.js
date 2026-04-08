import express from 'express';
import { submitFeedback, getFeedbackTickets } from '../controllers/feedbackController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', authenticate, submitFeedback);
// Only Admins / Managers can view the feedback tickets globally
router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), getFeedbackTickets);

export default router;
