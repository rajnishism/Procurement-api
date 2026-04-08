import prisma from './src/utils/db.js';
async function run() {
    const list = await prisma.prApproval.groupBy({
        by: ['prId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
    });
    console.log(JSON.stringify(list, null, 2));
    await prisma.$disconnect();
}
run();
