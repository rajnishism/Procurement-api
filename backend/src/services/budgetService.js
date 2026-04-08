import prisma from '../utils/db.js';

/**
 * Deducts a PO's amount from the corresponding MonthlyBudget(s).
 * 
 * @param {String} poId - The ID of the Purchase Order.
 * @param {Decimal} amount - The amount to deduct.
 */
export async function deductBudgetForPO(poId, amount) {
    try {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: poId },
            include: { pr: { include: { allocations: true } } }
        });

        if (!po || !po.pr) {
            console.warn(`[BudgetService] Could not find PR for PO ${poId}. Skipping automatic budget deduction.`);
            return;
        }

        const { month, year, allocations } = po.pr;

        if (!allocations || allocations.length === 0) {
            console.warn(`[BudgetService] No budget allocations found for PR ${po.pr.prNumber}.`);
            return;
        }

        // We deduct the total PO amount across the budget categories.
        // If there are multiple allocations, we spread proportionally.
        const totalAllocatedInPR = allocations.reduce((sum, a) => sum + parseFloat(a.amount), 0);

        for (const allocation of allocations) {
            // Proportion of the PO amount to deduct from this budget head
            const proportion = totalAllocatedInPR > 0 ? (parseFloat(allocation.amount) / totalAllocatedInPR) : 1;
            const deductionAmount = parseFloat(amount) * proportion;

            // Find matching MonthlyBudget
            const monthlyBudget = await prisma.monthlyBudget.findFirst({
                where: {
                    budgetHeadId: allocation.budgetHeadId,
                    subClassificationId: allocation.subClassificationId,
                    month: month,
                    year: year
                }
            });

            if (monthlyBudget) {
                await prisma.monthlyBudget.update({
                    where: { id: monthlyBudget.id },
                    data: {
                        allocated: { increment: deductionAmount },
                        remaining: { decrement: deductionAmount }
                    }
                });
                console.log(`[Budget] Deducted ₹${deductionAmount} from Head ${allocation.budgetHeadId} for month ${month}/${year}`);
            } else {
                console.warn(`[Budget] No MonthlyBudget found for Head ${allocation.budgetHeadId} for month ${month}/${year}`);
            }
        }

    } catch (error) {
        console.error('[BudgetService] Failed to deduct budget:', error.message);
        throw error;
    }
}

/**
 * Reverses a budget deduction (e.g., if PO is cancelled/rejected).
 */
export async function reverseBudgetForPO(poId, amount) {
    // Similar logic but with decrement/increment swapped
    try {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: poId },
            include: { pr: { include: { allocations: true } } }
        });

        if (!po || !po.pr) return;
        const { month, year, allocations } = po.pr;
        const totalAllocatedInPR = allocations.reduce((sum, a) => sum + parseFloat(a.amount), 0);

        for (const allocation of allocations) {
            const proportion = totalAllocatedInPR > 0 ? (parseFloat(allocation.amount) / totalAllocatedInPR) : 1;
            const reversalAmount = parseFloat(amount) * proportion;

            const monthlyBudget = await prisma.monthlyBudget.findFirst({
                where: { budgetHeadId: allocation.budgetHeadId, subClassificationId: allocation.subClassificationId, month, year }
            });

            if (monthlyBudget) {
                await prisma.monthlyBudget.update({
                    where: { id: monthlyBudget.id },
                    data: {
                        allocated: { decrement: reversalAmount },
                        remaining: { increment: reversalAmount }
                    }
                });
            }
        }
    } catch (error) {
        console.error('[BudgetService] Failed to reverse budget:', error.message);
    }
}
