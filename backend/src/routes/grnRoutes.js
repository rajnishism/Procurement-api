import express from 'express';
import { getGRNs, getGRNById, getGRNsByPO, createGRN } from '../controllers/grnController.js';

const router = express.Router();

router.get('/', getGRNs);
router.post('/', createGRN);
router.get('/po/:poId', getGRNsByPO);
router.get('/:id', getGRNById);

export default router;
