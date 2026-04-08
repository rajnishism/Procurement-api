import express from 'express';
import { getSubClassifications, createSubClassification } from '../controllers/subClassificationController.js';

const router = express.Router();

router.get('/', getSubClassifications);
router.post('/', createSubClassification);

export default router;
