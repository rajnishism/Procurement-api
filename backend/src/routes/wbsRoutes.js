import express from 'express';
import { 
  getWbsMappings, 
  createWbsMapping, 
  resolveWbs,
  getDepartmentNames,
  getCategoriesForDepartment,
  getWbsCodesForCategory
} from '../controllers/wbsController.js';

const router = express.Router();

router.get('/', getWbsMappings);
router.post('/', createWbsMapping);
router.get('/resolve/:wbsCode', resolveWbs);
router.get('/departments', getDepartmentNames);
router.get('/categories', getCategoriesForDepartment);
router.get('/codes', getWbsCodesForCategory);

export default router;
