import express from 'express';
import { getAuditLogs } from '../controllers/auditController.js';

import { authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authorize('ADMIN'), getAuditLogs);

export default router;
