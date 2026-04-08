import prisma from './src/utils/db.js';
async function run() {
    const approvals = await prisma.prApproval.findMany({
        include: { approver: true, pr: true },
        take: 20,
        orderBy: { createdAt: 'desc' }
    });
    console.log(JSON.stringify(approvals, null, 2));
    await prisma.$disconnect();
}
run();
