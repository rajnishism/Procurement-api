import { ensureWbsExists } from '../utils/wbsSync.js';
import prisma from '../utils/db.js';

export const calculateAllocation = async (prDetails) => {
    const { totalValue, wbsCode } = prDetails;

    // 1. Resolve and Sync WBS from Config -> DB
    let budgetHeadId = null;
    let subClassificationId = null;

    if (wbsCode) {
        const syncResult = await ensureWbsExists(wbsCode);
        if (syncResult) {
            budgetHeadId = syncResult.budgetHeadId;
        }
    }

    // 2. Suggest Allocation
    const suggestion = {
        budgetHeadId,
        subClassificationId,
        amount: totalValue,
        status: 'PENDING_CHECK',
        notes: []
    };

    if (budgetHeadId) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const budgetQuery = {
            budgetHeadId,
            month,
            year
        };

        if (subClassificationId) {
            budgetQuery.subClassificationId = subClassificationId;
        }

        const monthlyBudget = await prisma.monthlyBudget.findFirst({
            where: budgetQuery
        });

        if (monthlyBudget) {
            if (Number(monthlyBudget.remaining) >= totalValue) {
                suggestion.status = 'AVAILABLE';
                suggestion.notes.push(`Budget available. Remaining: ${monthlyBudget.remaining}`);
            } else {
                suggestion.status = 'INSUFFICIENT';
                suggestion.notes.push(`Insufficient budget. Remaining: ${monthlyBudget.remaining}`);
            }
        } else {
            suggestion.status = 'NO_BUDGET_DEFINED';
            suggestion.notes.push('No monthly budget defined for this period.');
        }
    } else {
        suggestion.status = 'UNMAPPED';
        suggestion.notes.push('WBS Code could not be mapped to a Budget Head.');
    }

    return suggestion;
};
