import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');
import prisma from '../utils/db.js';
import { wbsConfig, findByWbsCode } from '../config/wbsCodes.js';
import { ensureDepartmentExists, ensureWbsExists } from '../utils/wbsSync.js';

export const importDataFromExcel = async (buffer, type = null) => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    return await processWorkbook(workbook, type);
};

const getColumnMapping = (sheet) => {
    const headerRow = sheet.getRow(1);
    const mapping = {};
    headerRow.eachCell((cell, colNumber) => {
        const header = cell.text?.toLowerCase().trim();
        if (header.includes('dept') || header.includes('department')) mapping.dept = colNumber;
        else if (header.includes('wbs') || header.includes('budget_head_code')) mapping.wbs = colNumber;
        else if (header.includes('sub_name') || header.includes('subclassification')) mapping.sub = colNumber;
        else if (header.includes('item') || header.includes('description') || header.includes('particular')) mapping.head = colNumber;
        else if (header.includes('pr number') || header.includes('pr#') || header.includes('indent')) mapping.prNumber = colNumber;
        else if (header.includes('date')) mapping.date = colNumber;
        else if (header.includes('month')) mapping.month = colNumber;
        else if (header.includes('year')) mapping.year = colNumber;
        else if (header.includes('budget') || header.includes('expense') || header.includes('amount') || header.includes('value') || header.includes('total')) mapping.amount = colNumber;
        else if (header.includes('area')) mapping.area = colNumber;
    });
    return mapping;
};

const processWorkbook = async (workbook, type = null) => {
    const log = [];

    const shouldProcessBudget = !type || type === 'budget';
    const shouldProcessExpense = !type || type === 'expense';
    const shouldProcessPr = !type || type === 'pr';

    // --- Process Budget Sheet ---
    if (shouldProcessBudget) {
        const bhSheet = workbook.getWorksheet('Budget') || workbook.getWorksheet('Sheet1') || workbook.worksheets[0];
        if (bhSheet) {
            log.push('--- Processing Budget Sheet ---');
            const mapping = getColumnMapping(bhSheet);

            for (let i = 2; i <= bhSheet.rowCount; i++) {
                const row = bhSheet.getRow(i);
                const wbsCode = row.getCell(mapping.wbs || 2).text?.trim();
                const subClassName = mapping.sub ? row.getCell(mapping.sub).text?.trim() : null; // NEW: optional sub_name
                const month = parseInt(row.getCell(mapping.month || 4).text?.trim());
                const year = parseInt(row.getCell(mapping.year || 5).text?.trim());
                const amountText = row.getCell(mapping.amount || 6).text?.trim() || '0';
                const amount = parseFloat(amountText.replace(/[^0-9.]/g, '')) || 0; // Sanitize input

                if (!wbsCode) {
                    log.push(`Skipped Budget Row ${i}: Missing WBS Code.`);
                    continue;
                }
                if (isNaN(month)) {
                    log.push(`Skipped Budget Row ${i}: Invalid or missing Month.`);
                    continue;
                }
                if (amount <= 0) {
                    log.push(`Skipped Budget Row ${i}: Missing or zero Amount.`);
                    continue;
                }

                try {
                    // 1. Resolve and sync WBS from Config
                    const syncResult = await ensureWbsExists(wbsCode);
                    if (!syncResult) {
                        log.push(`Skipped Row ${i}: WBS '${wbsCode}' not found in configuration.`);
                        continue;
                    }

                    const { budgetHeadId } = syncResult;

                    // 2. Handle Sub-classification if present (e.g. sub_name column)
                    let subClassId = null;
                    if (subClassName) {
                        const existingSub = await prisma.subClassification.findFirst({
                            where: { budgetHeadId, name: { equals: subClassName, mode: 'insensitive' } }
                        });
                        if (existingSub) {
                            subClassId = existingSub.id;
                        } else {
                            const newSub = await prisma.subClassification.create({
                                data: {
                                    name: subClassName,
                                    code: `${wbsCode}_${subClassName.substring(0, 5).toUpperCase()}_${Date.now().toString().slice(-4)}`,
                                    budgetHead: { connect: { id: budgetHeadId } }
                                }
                            });
                            subClassId = newSub.id;
                        }
                    }

                    // --- A. Sync to Sub-classification (if exists) ---
                    if (subClassId) {
                        const existingSubBudget = await prisma.monthlyBudget.findFirst({
                            where: { budgetHeadId, subClassificationId: subClassId, month, year: year || 2026 }
                        });
                        if (existingSubBudget) {
                            await prisma.monthlyBudget.update({
                                where: { id: existingSubBudget.id },
                                data: { amount, remaining: Number(amount) - Number(existingSubBudget.allocated) }
                            });
                        } else {
                            await prisma.monthlyBudget.create({
                                data: {
                                    month, year: year || 2026, amount, allocated: 0, remaining: amount,
                                    budgetHead: { connect: { id: budgetHeadId } },
                                    subClassification: { connect: { id: subClassId } }
                                }
                            });
                        }
                    }

                    // --- B. Sync to HEAD LEVEL (always cumulative total for the WBS) ---
                    const headBudget = await prisma.monthlyBudget.findFirst({
                        where: { budgetHeadId, subClassificationId: null, month, year: year || 2026 }
                    });

                    if (headBudget) {
                        // If we are updating a sub-item, we calculate the difference or just sum all subs later?
                        // For simplicity in migration, we assume each row is a fresh value.
                        // But wait, if they have multiple sub-classifications for same month, we should SUM them.
                        await prisma.monthlyBudget.update({
                            where: { id: headBudget.id },
                            data: { 
                                amount: subClassId ? { increment: amount } : amount,
                                remaining: { increment: amount } 
                            }
                        });
                    } else {
                        await prisma.monthlyBudget.create({
                            data: {
                                month,
                                year: year || 2026,
                                amount,
                                allocated: 0,
                                remaining: amount,
                                budgetHead: { connect: { id: budgetHeadId } }
                            }
                        });
                    }

                    log.push(`Processed Budget: ${wbsCode}${subClassName ? ' - ' + subClassName : ''} (${month}/${year || 2026})`);
                } catch (e) {
                    log.push(`Error Row ${i}: ${e.message}`);
                }
            }
        }
    }

    // --- Process Expense Sheet ---
    if (shouldProcessExpense) {
        const expSheet = workbook.getWorksheet('Expense') || workbook.getWorksheet('Expenses') || (workbook.worksheets.length > 1 ? workbook.worksheets[1] : workbook.worksheets[0]);
        if (expSheet) {
            log.push('--- Processing Expense Sheet ---');
            const mapping = getColumnMapping(expSheet);

            for (let i = 2; i <= expSheet.rowCount; i++) {
                const row = expSheet.getRow(i);
                const wbsCode = row.getCell(mapping.wbs || 2).text?.trim();
                const subClassName = mapping.sub ? row.getCell(mapping.sub).text?.trim() : row.getCell(mapping.head || 3).text?.trim();
                const month = parseInt(row.getCell(mapping.month || 4).text?.trim());
                const year = parseInt(row.getCell(mapping.year || 5).text?.trim());
                const amountText = row.getCell(mapping.amount || 6).text?.trim() || '0';
                const amount = parseFloat(amountText.replace(/[^0-9.]/g, '')) || 0;

                if (!wbsCode) {
                    log.push(`Skipped Expense Row ${i}: Missing WBS Code.`);
                    continue;
                }
                if (isNaN(month)) {
                    log.push(`Skipped Expense Row ${i}: Invalid or missing Month.`);
                    continue;
                }
                if (amount <= 0) {
                    log.push(`Skipped Expense Row ${i}: Missing or zero Amount.`);
                    continue;
                }

                try {
                    const syncResult = await ensureWbsExists(wbsCode);
                    if (!syncResult) {
                        log.push(`Skipped Expense Row ${i}: WBS '${wbsCode}' not found in configuration.`);
                        continue;
                    }

                    const { budgetHeadId } = syncResult;

                    // 1. Always update the HEAD LEVEL budget
                    const headBudget = await prisma.monthlyBudget.findFirst({
                        where: { budgetHeadId, subClassificationId: null, month, year }
                    });

                    if (headBudget) {
                        await prisma.monthlyBudget.update({
                            where: { id: headBudget.id },
                            data: {
                                allocated: { increment: amount },
                                remaining: { decrement: amount }
                            }
                        });
                    } else {
                        await prisma.monthlyBudget.create({
                            data: {
                                month,
                                year,
                                amount: 0,
                                allocated: amount,
                                remaining: -amount,
                                budgetHead: { connect: { id: budgetHeadId } }
                            }
                        });
                    }

                    // 2. Process sub-classification
                    if (subClassName) {
                        const existingSub = await prisma.subClassification.findFirst({
                            where: { budgetHeadId, name: { equals: subClassName, mode: 'insensitive' } }
                        });

                        let subClassId;
                        if (existingSub) {
                            subClassId = existingSub.id;
                        } else {
                            const newSub = await prisma.subClassification.create({
                                data: {
                                    name: subClassName,
                                    code: `${wbsCode}_${subClassName.substring(0, 5).toUpperCase()}_${Date.now().toString().slice(-4)}`,
                                    budgetHead: { connect: { id: budgetHeadId } }
                                }
                            });
                            subClassId = newSub.id;
                        }

                        const subBudget = await prisma.monthlyBudget.findFirst({
                            where: { budgetHeadId, subClassificationId: subClassId, month, year }
                        });

                        if (subBudget) {
                            await prisma.monthlyBudget.update({
                                where: { id: subBudget.id },
                                data: {
                                    allocated: { increment: amount },
                                    remaining: { decrement: amount }
                                }
                            });
                        } else {
                            await prisma.monthlyBudget.create({
                                data: {
                                    month,
                                    year,
                                    amount: 0,
                                    allocated: amount,
                                    remaining: -amount,
                                    budgetHead: { connect: { id: budgetHeadId } },
                                    subClassification: { connect: { id: subClassId } }
                                }
                            });
                        }
                    }

                    log.push(`Logged Expense: ${subClassName || 'General'} - ${amount}`);
                } catch (e) {
                    log.push(`Error Expense Row ${i}: ${e.message}`);
                }
            }
        }
    }

    // --- Process PR Sheet ---
    if (shouldProcessPr) {
        const prSheet = workbook.getWorksheet('PR') || workbook.getWorksheet('PurchaseRequests') || (workbook.worksheets.length > 2 ? workbook.worksheets[2] : workbook.worksheets[0]);
        if (prSheet) {
            log.push('--- Processing PR Sheet ---');
            const mapping = getColumnMapping(prSheet);

            for (let i = 2; i <= prSheet.rowCount; i++) {
                const row = prSheet.getRow(i);
                const prNumber = row.getCell(mapping.prNumber || 1).text?.trim();
                const prDateText = row.getCell(mapping.date || 2).text?.trim();
                const description = row.getCell(mapping.head || 3).text?.trim();
                const totalValue = parseFloat(row.getCell(mapping.amount || 4).text?.trim() || '0');
                const deptCode = row.getCell(mapping.dept || 5).text?.trim();
                const wbsCode = row.getCell(mapping.wbs || 6).text?.trim();
                const area = row.getCell(mapping.area || 7).text?.trim();

                if (!prNumber) {
                    log.push(`Skipped PR Row ${i}: Missing PR/Indent Number.`);
                    continue;
                }
                if (!deptCode && !wbsCode) {
                    log.push(`Skipped PR Row ${i}: Both Department and WBS Code are missing.`);
                    continue;
                }
                if (totalValue <= 0) {
                    log.push(`Skipped PR Row ${i}: PR has no value (Amount is zero).`);
                    continue;
                }

                try {
                    let departmentId = null;

                    // Try to resolve dept from WBS first if available
                    if (wbsCode) {
                        const syncResult = await ensureWbsExists(wbsCode);
                        if (syncResult) {
                            departmentId = syncResult.departmentId;
                        }
                    }

                    // Fallback to dept code resolution
                    if (!departmentId && deptCode) {
                        const configDept = wbsConfig.find(d => d.department.substring(0, 3).toUpperCase() === deptCode);
                        departmentId = await ensureDepartmentExists(configDept ? configDept.department : deptCode);
                    }

                    if (!departmentId) {
                        log.push(`Skipped PR Row ${i}: Could not resolve department.`);
                        continue;
                    }

                    const prDate = prDateText ? new Date(prDateText) : new Date();
                    const month = prDate.getMonth() + 1;
                    const year = prDate.getFullYear();

                    await prisma.pr.upsert({
                        where: { prNumber },
                        update: {
                            prDate,
                            month,
                            year,
                            description: description || 'Imported PR',
                            totalValue,
                            department: { connect: { id: departmentId } },
                            wbsCode,
                            area,
                            status: 'APPROVED'
                        },
                        create: {
                            prNumber,
                            prDate,
                            month,
                            year,
                            description: description || 'Imported PR',
                            totalValue,
                            department: { connect: { id: departmentId } },
                            wbsCode,
                            area,
                            status: 'APPROVED'
                        }
                    });

                    log.push(`Processed PR: ${prNumber} - ${totalValue}`);
                } catch (e) {
                    log.push(`Error PR Row ${i}: ${e.message}`);
                }
            }
        }
    }

    return log;
};
