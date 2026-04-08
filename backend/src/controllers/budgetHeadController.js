import prisma from '../utils/db.js';
import { syncAllBudgetHeads } from '../utils/wbsSync.js';
import { wbsConfig } from '../config/wbsCodes.js';

export const getBudgetHeads = async (req, res) => {
    try {
        // Sync config data to DB first
        await syncAllBudgetHeads();

        const budgetHeads = await prisma.budgetHead.findMany({
            include: {
                department: true,
                monthlyBudgets: {
                    where: {
                        subClassificationId: null
                    }
                }
            }
        });

        // 1. Flatten all categories from config for easy lookup
        const configCategories = [];
        wbsConfig.forEach(dept => {
            dept.categories.forEach(cat => {
                configCategories.push({
                    name: cat.category,
                    deptName: dept.department,
                    wbsCodes: cat.wbsCodes
                });
            });
        });

        // 2. Calculate balance and enrich with WBS codes from config
        const headsWithBalance = budgetHeads.map(head => {
            const totalBalance = head.monthlyBudgets.reduce((acc, budget) => acc + Number(budget.remaining), 0);
            
            // Look up WBS code in config by name and department
            const configMatch = configCategories.find(c => 
                c.name === head.name && c.deptName === head.department?.name
            );

            const { monthlyBudgets, ...headData } = head;
            return {
                ...headData,
                // Replace internal code with the hierarchical WBS code from config
                code: configMatch ? configMatch.wbsCodes.join(', ') : head.code,
                totalBalance
            };
        });

        res.json(headsWithBalance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createBudgetHead = async (req, res) => {
    try {
        console.log('Creating Budget Head:', req.body);
        const { name, code, departmentId } = req.body;

        if (!name || !code || !departmentId) {
            return res.status(400).json({ error: 'Name, Code and Department are required' });
        }

        const budgetHead = await prisma.budgetHead.create({
            data: { name, code, departmentId }
        });
        res.json(budgetHead);
    } catch (error) {
        console.error('Create Budget Head Error:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Budget Head with this code already exists' });
        }
        res.status(500).json({ error: error.message });
    }
};
