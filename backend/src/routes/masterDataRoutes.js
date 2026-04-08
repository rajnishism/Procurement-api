import express from 'express';
import departmentRoutes from './departmentRoutes.js';
import budgetHeadRoutes from './budgetHeadRoutes.js';
import subClassificationRoutes from './subClassificationRoutes.js';
import wbsRoutes from './wbsRoutes.js';
import vendorRoutes from './vendorRoutes.js';
import approverRoutes from './approverRoutes.js';

const router = express.Router();

// Centralized Master Data Management
router.use('/departments', departmentRoutes);
router.use('/budget-heads', budgetHeadRoutes);
router.use('/sub-classifications', subClassificationRoutes);
router.use('/wbs', wbsRoutes);
router.use('/vendors', vendorRoutes);
router.use('/approvers', approverRoutes);

export default router;
