import express from 'express';
import { getInvoices, getInvoiceById, createInvoice, runThreeWayMatch, approveInvoice } from '../controllers/invoiceController.js';

const router = express.Router();

router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoiceById);
router.post('/:id/match', runThreeWayMatch);
router.patch('/:id/approve', approveInvoice);

export default router;
