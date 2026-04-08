import express from 'express';
import { getMonthlyBudgets, createOrUpdateMonthlyBudget, getDashboardStats, getBudgetSummary } from '../controllers/monthlyBudgetController.js';

const router = express.Router();

router.get('/', getMonthlyBudgets);
router.get('/stats', getDashboardStats);
router.get('/summary', getBudgetSummary);
router.post('/', createOrUpdateMonthlyBudget);

export default router;
