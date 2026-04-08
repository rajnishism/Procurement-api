import express from 'express';
import { submitTechReview, getTechReviewsByRfq, triggerTechnicalReview } from '../controllers/techReviewController.js';

const router = express.Router();

router.post('/', submitTechReview);
router.get('/:rfqId', getTechReviewsByRfq);
router.post('/trigger/:rfqId', triggerTechnicalReview);

export default router;
