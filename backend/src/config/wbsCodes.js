/**
 * WBS Codes Configuration
 *
 * Hierarchical structure: Department → Category → WBS Codes
 * Use this config to resolve correct WBS codes and department
 * anywhere in the application.
 *
 * To look up WBS codes by department/category, use the helper
 * functions exported below.
 */

const wbsConfig = [
  {
    department: "Mining",
    categories: [

      {
        category: "Mine Equipment Cashflow",
        wbsCodes: ["M-1017-M-MIN-EQP"],
      },
      {
        category: "Employees",
        wbsCodes: ["M-1017-M-MIN-EMP"],
      },
      {
        category: "Gasoline & Petrol",
        wbsCodes: ["M-1017-M-MIN-GSP"],
      },
      {
        category: "Computer and IT Support",
        wbsCodes: ["M-1017-M-MIN-IT"],
      },
      {
        category: "Explosives",
        wbsCodes: ["M-1017-M-MIN-EXP"],
      },
      {
        category: "GET",
        wbsCodes: ["M-1017-M-MIN-GET"],
      },
      {
        category: "Auxiliary Mine Equipment",
        wbsCodes: ["M-1017-M-MIN-AME"],
      },
      {
        category: "PMS",
        wbsCodes: ["M-1017-M-MIN-PM"],
      },
      {
        category: "Tires - Rims",
        wbsCodes: ["M-1017-M-MIN-TR"],
      },
      {
        category: "Contractors",
        wbsCodes: ["M-1017-M-MIN-CON"],
      },
      {
        category: "Mine Misc. Adds",
        wbsCodes: ["M-1017-M-MIN-MMA"],
      },
      {
        category: "Heat & Electric",
        wbsCodes: ["M-1017-M-MIN-HE"],
      },
      {
        category: "Drill Maintenance",
        wbsCodes: ["M-1017-M-MIN-DM"],
      },
      {
        category: "MES Washbay",
        wbsCodes: ["M-1017-M-MIN-MES"],
      },
      {
        category: "Drill Steel",
        wbsCodes: ["M-1017-M-MIN-DS"],
      },
      {
        category: "Drill Bits",
        wbsCodes: ["M-1017-M-MIN-DB"],
      },
      {
        category: "Hydraulic Tooling",
        wbsCodes: ["M-1017-M-MIN-HT"],
      },
      {
        category: "Insurance",
        wbsCodes: ["M-1017-M-MIN-INS"],
      },
      {
        category: "Survey Supplies",
        wbsCodes: ["M-1017-M-MIN-SS"],
      },
      {
        category: "PPE",
        wbsCodes: ["M-1017-M-MIN-PPE"],
      },
      {
        category: "MES Lunchroom & Dry",
        wbsCodes: ["M-1017-M-MIN-MES"],
      },
      {
        category: "Fire Prevention",
        wbsCodes: ["M-1017-M-MIN-FP"],
      },
      {
        category: "Vib Tests",
        wbsCodes: ["M-1017-M-MIN-VT"],
      },
      {
        category: "MES Hand Tools",
        wbsCodes: ["M-1017-M-MIN-HT"],
      },
      {
        category: "Nuts Bolts Hoses",
        wbsCodes: ["M-1017-M-MIN-NBH"],
      },
      {
        category: "MES Misc",
        wbsCodes: ["M-1017-M-MIN-MES"],
      },
      {
        category: "Meals and Entertainment",
        wbsCodes: ["M-1017-M-MIN-ADM"],
      },
      {
        category: "Lumber",
        wbsCodes: ["M-1017-M-MIN-MES"],
      },
    ],
  },
];

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Get all departments.
 * @returns {string[]}
 */
const getDepartments = () => wbsConfig.map((d) => d.department);

/**
 * Get all categories for a given department.
 * @param {string} department
 * @returns {string[]}
 */
const getCategoriesByDepartment = (department) => {
  const dept = wbsConfig.find(
    (d) => d.department.toLowerCase() === department.toLowerCase()
  );
  return dept ? dept.categories.map((c) => c.category) : [];
};

/**
 * Get WBS codes for a given department and category.
 * @param {string} department
 * @param {string} category
 * @returns {string[]}
 */
const getWbsCodes = (department, category) => {
  const dept = wbsConfig.find(
    (d) => d.department.toLowerCase() === department.toLowerCase()
  );
  if (!dept) return [];
  const cat = dept.categories.find(
    (c) => c.category.toLowerCase() === category.toLowerCase()
  );
  return cat ? cat.wbsCodes : [];
};

/**
 * Find the department and category for a given WBS code.
 * @param {string} wbsCode
 * @returns {{ department: string, category: string } | null}
 */
const findByWbsCode = (wbsCode) => {
  for (const dept of wbsConfig) {
    for (const cat of dept.categories) {
      if (cat.wbsCodes.includes(wbsCode)) {
        return { department: dept.department, category: cat.category };
      }
    }
  }
  return null;
};

export {
  wbsConfig,
  getDepartments,
  getCategoriesByDepartment,
  getWbsCodes,
  findByWbsCode,
};
