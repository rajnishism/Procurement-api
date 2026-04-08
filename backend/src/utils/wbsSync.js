import prisma from './db.js';
import { wbsConfig, findByWbsCode } from '../config/wbsCodes.js';

/**
 * Ensures a department from the config file exists in the database.
 * If not, it creates it using settings from the config.
 * 
 * @param {string} departmentName - The department name in config (e.g. "Mining")
 * @returns {Promise<string>} - The UUID of the department in the database
 */
export const ensureDepartmentExists = async (departmentName) => {
    // 1. Try to find it in the DB
    let dept = await prisma.department.findFirst({
        where: { name: { equals: departmentName, mode: 'insensitive' } }
    });

    if (dept) return dept.id;

    // 2. If it's missing, verify it's in our config
    const configDept = wbsConfig.find(d => d.department.toLowerCase() === departmentName.toLowerCase());
    
    // Fallback: Create it if it doesn't exist even in config, or use config defaults
    const name = configDept ? configDept.department : departmentName;
    const code = name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 100);

    dept = await prisma.department.create({
        data: { name, code }
    });

    console.log(`[Sync] Automatically created department: ${name} (${code})`);
    return dept.id;
};

export const ensureWbsExists = async (wbsCode) => {
    // 1. Precise WBS Match
    let mapping = findByWbsCode(wbsCode);

    // 2. [Fallback] Match against Category Name (Case-insensitive)
    if (!mapping) {
        for (const dept of wbsConfig) {
            const categoryMatch = dept.categories.find(c => c.category.toLowerCase() === wbsCode.toLowerCase());
            if (categoryMatch) {
                mapping = { department: dept.department, category: categoryMatch.category };
                break;
            }
        }
    }

    // 3. [Fallback] Match against Department Code/Name prefix (e.g., "MIN")
    if (!mapping) {
        const configDept = wbsConfig.find(d => 
            d.department.toLowerCase().startsWith(wbsCode.toLowerCase()) ||
            wbsCode.toLowerCase().startsWith(d.department.toLowerCase().substring(0, 3))
        );
        if (configDept) {
            mapping = { department: configDept.department, category: "General" };
        }
    }

    // 4. [Last Resort] If still not found, create a generic entry
    if (!mapping) {
        console.log(`[Sync] '${wbsCode}' not found in configuration. Treating as direct name for 'General Mining'.`);
        mapping = { department: "Mining", category: wbsCode };
    }

    // 2. Ensure Dept exists
    const departmentId = await ensureDepartmentExists(mapping.department);

    // 3. Ensure Budget Head exists for this category (we treat category as Budget Head)
    let budgetHead = await prisma.budgetHead.findFirst({
        where: { name: mapping.category, departmentId }
    });

    if (!budgetHead) {
        budgetHead = await prisma.budgetHead.create({
            data: {
                name: mapping.category,
                code: mapping.category.substring(0, 5).toUpperCase() + Math.floor(Math.random() * 100),
                departmentId
            }
        });
        console.log(`[Sync] Automatically created budget head: ${mapping.category}`);
    }

    // 4. Ensure WBS Master entry exists
    let wbsMaster = await prisma.wbsMaster.findUnique({
        where: { wbsCode }
    });

    if (!wbsMaster) {
        wbsMaster = await prisma.wbsMaster.create({
            data: {
                wbsCode,
                departmentId,
                budgetHeadId: budgetHead.id
            }
        });
        console.log(`[Sync] Automatically created WBS master record: ${wbsCode}`);
    }

    return {
        departmentId: wbsMaster.departmentId,
        budgetHeadId: wbsMaster.budgetHeadId
    };
};

/**
 * Syncs all categories from config as Budget Heads in the database.
 */
export const syncAllBudgetHeads = async () => {
    for (const deptConfig of wbsConfig) {
        const departmentId = await ensureDepartmentExists(deptConfig.department);
        for (const cat of deptConfig.categories) {
            let budgetHead = await prisma.budgetHead.findFirst({
                where: { name: cat.category, departmentId }
            });

            if (!budgetHead) {
                await prisma.budgetHead.create({
                    data: {
                        name: cat.category,
                        code: cat.category.substring(0, 5).toUpperCase() + Math.floor(Math.random() * 100),
                        departmentId
                    }
                });
            }
        }
    }
};
