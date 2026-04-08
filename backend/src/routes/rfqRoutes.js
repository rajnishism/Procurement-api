import express from 'express';
import { getRFQs, getRFQById, createRFQ, sendRFQ, closeRFQ, getQuotationComparison, selectVendor } from '../controllers/rfqController.js';

const router = express.Router();

router.get('/', getRFQs);
router.post('/', createRFQ);
router.get('/:id', getRFQById);
router.post('/:id/send', sendRFQ);
router.post('/:id/close', closeRFQ);
router.get('/:id/compare', getQuotationComparison);
router.post('/:id/select-vendor', selectVendor);

export default router;
