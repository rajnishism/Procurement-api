import express from 'express';
import multer from 'multer';
import { importData, exportFullDatabaseExcel } from '../controllers/migrationController.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/import', upload.single('file'), importData);
router.get('/export-db', exportFullDatabaseExcel);

export default router;
