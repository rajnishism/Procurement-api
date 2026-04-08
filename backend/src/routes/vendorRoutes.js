import express from 'express';
import { getVendors, createVendor, updateVendor, deleteVendor } from '../controllers/vendorController.js';

const router = express.Router();

router.get('/', getVendors);
router.post('/', createVendor);
router.patch('/:id', updateVendor);
router.delete('/:id', deleteVendor);

export default router;
