import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTechSpec, getTechSpecByPrId } from '../controllers/techSpecController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/tech-specs')),
    filename: (req, file, cb) => cb(null, `TECHSPEC-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.post('/', upload.single('file'), createTechSpec);
router.get('/:prId', getTechSpecByPrId);

export default router;
