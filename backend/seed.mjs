import prisma from './src/utils/db.js';

async function main() {
    console.log('Seeding database...');

    try {
        // Create Department
        const miningDept = await prisma.department.upsert({
            where: { code: 'MIN' },
            update: {},
            create: {
                name: 'Mining',
                code: 'MIN',
            },
        });

        console.log('Created Department:', miningDept.name);

        // Create Budget Heads
        const budgetHeadsData = [
            { name: 'Mine Equipment', code: 'MEQ' },
            { name: 'Ground Engaging Tools', code: 'GET' },
            { name: 'Explosives', code: 'EXP' },
        ];

        for (const bh of budgetHeadsData) {
            // For upserting with compound unique constraint, we need to handle it carefully
            // Prisma upsert with compound keys requires the arguments to match the usage

            const exists = await prisma.budgetHead.findFirst({
                where: {
                    departmentId: miningDept.id,
                    name: bh.name
                }
            });

            let budgetHead;
            if (exists) {
                budgetHead = exists;
            } else {
                budgetHead = await prisma.budgetHead.create({
                    data: {
                        name: bh.name,
                        code: bh.code,
                        departmentId: miningDept.id,
                    }
                });
            }

            console.log('Created Budget Head:', budgetHead.name);

            // Create Sub Classifications (Example for GET)
            if (bh.code === 'GET') {
                const subParams = { name: 'Drill 1', code: 'DR1', budgetHeadId: budgetHead.id };
                const subExists = await prisma.subClassification.findFirst({ where: { code: 'DR1' } });

                if (!subExists) {
                    await prisma.subClassification.create({ data: subParams });
                    console.log('Created Sub Classification: Drill 1');
                }
            }
        }

        // Create WBS Mapping
        // M-1017-M-MIN-GET -> Mining / GET
        const getHead = await prisma.budgetHead.findFirst({ where: { code: 'GET' } });

        if (getHead) {
            const wbsCode = 'M-1017-M-MIN-GET';
            const wbsExists = await prisma.wbsMaster.findUnique({ where: { wbsCode } });

            if (!wbsExists) {
                await prisma.wbsMaster.create({
                    data: {
                        wbsCode,
                        departmentId: miningDept.id,
                        budgetHeadId: getHead.id
                    }
                });
                console.log('Created WBS Mapping: M-1017-M-MIN-GET');
            }
        }

        // Create Monthly Budget for Feb 2026
        if (getHead) {
            const budgetParams = {
                budgetHeadId: getHead.id,
                month: 2,
                year: 2026
            };
            const budgetExists = await prisma.monthlyBudget.findFirst({ where: budgetParams });

            if (!budgetExists) {
                await prisma.monthlyBudget.create({
                    data: {
                        ...budgetParams,
                        amount: 500000, // 5 Lakhs
                        remaining: 500000,
                        allocated: 0
                    }
                });
                console.log('Created Monthly Budget: Feb 2026 for GET');
            }
        }

        console.log('Seeding finished.');
    } catch (error) {
        console.error('Seeding error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
