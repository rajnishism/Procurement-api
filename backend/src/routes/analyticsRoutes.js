import { Router } from 'express';
import {
  getFinanceSummary,
  getProcurementSummary,
  getDashboard,
} from '../controllers/analyticsController.js';

const router = Router();

// GET /api/analytics/finance-summary
// Query: ?range=7d|30d|custom  &department=mining|all  &status=pending|approved|rejected|all
//        &dateFrom=YYYY-MM-DD  &dateTo=YYYY-MM-DD
router.get('/finance-summary', getFinanceSummary);

// GET /api/analytics/procurement-summary
// Query: same filter params as above (status ignored — procurement aggregates all statuses)
router.get('/procurement-summary', getProcurementSummary);

// GET /api/analytics/dashboard  (combined view)
router.get('/dashboard', getDashboard);

export default router;
