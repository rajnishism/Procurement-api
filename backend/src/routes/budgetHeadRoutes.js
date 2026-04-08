import express from 'express';
import { getBudgetHeads, createBudgetHead } from '../controllers/budgetHeadController.js';

const router = express.Router();

router.get('/', getBudgetHeads);
router.post('/', createBudgetHead);

export default router;
