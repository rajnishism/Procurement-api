/**
 * WBS Controller
 *
 * All WBS lookups now use the local config file (wbsCodes.js) instead of the
 * database. This ensures the system works even when the DB tables are empty.
 */

import {
  wbsConfig,
  getDepartments as getDeptNames,
  getCategoriesByDepartment,
  getWbsCodes,
  findByWbsCode,
} from '../config/wbsCodes.js';

/**
 * GET /api/wbs
 * Returns the full WBS hierarchy from config.
 */
export const getWbsMappings = (req, res) => {
  try {
    res.json(wbsConfig);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/wbs/departments
 * Returns all department names from config.
 */
export const getDepartmentNames = (req, res) => {
  try {
    res.json(getDeptNames());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/wbs/categories?department=Mining
 * Returns all categories for a given department.
 */
export const getCategoriesForDepartment = (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res.status(400).json({ error: 'department query param is required' });
    }
    const categories = getCategoriesByDepartment(department);
    if (!categories.length) {
      return res.status(404).json({ error: `No categories found for department: ${department}` });
    }
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/wbs/codes?department=Mining&category=Explosives
 * Returns WBS codes for a given department + category.
 */
export const getWbsCodesForCategory = (req, res) => {
  try {
    const { department, category } = req.query;
    if (!department || !category) {
      return res.status(400).json({ error: 'department and category query params are required' });
    }
    const codes = getWbsCodes(department, category);
    if (!codes.length) {
      return res.status(404).json({ error: `No WBS codes found for ${department} / ${category}` });
    }
    res.json(codes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/wbs/resolve/:wbsCode
 * Resolves a WBS code to its department and category from config.
 */
export const resolveWbs = (req, res) => {
  try {
    const { wbsCode } = req.params;
    const result = findByWbsCode(wbsCode);
    if (!result) {
      return res.status(404).json({ error: `WBS Code '${wbsCode}' not found in config` });
    }
    res.json(result); // { department, category }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/wbs
 * Stub — creation is now managed via the config file, not the DB.
 */
export const createWbsMapping = (req, res) => {
  res
    .status(400)
    .json({ error: 'WBS mappings are managed via the config file (wbsCodes.js). Please update the file directly.' });
};
