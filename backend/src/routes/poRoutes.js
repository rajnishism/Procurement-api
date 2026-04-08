import express from 'express';
import { getPOs, getPOById, createPO, issuePO, acknowledgePO, cancelPO } from '../controllers/poController.js';

const router = express.Router();

router.get('/', getPOs);
router.post('/', createPO);
router.get('/:id', getPOById);
router.patch('/:id/issue', issuePO);
router.patch('/:id/acknowledge', acknowledgePO);
router.patch('/:id/cancel', cancelPO);

export default router;
