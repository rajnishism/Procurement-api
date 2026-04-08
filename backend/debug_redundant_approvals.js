import prisma from './src/utils/db.js';
async function run() {
    const prsWithApprovals = await prisma.pr.findMany({
        where: { deletedAt: null },
        include: { _count: { select: { approvals: true } } },
        orderBy: { approvals: { _count: 'desc' } },
        take: 5
    });
    
    for (const pr of prsWithApprovals) {
        console.log(`PR: ${pr.prNumber} | Approvals: ${pr._count.approvals}`);
        const approvals = await prisma.prApproval.findMany({
            where: { prId: pr.id },
            include: { approver: true }
        });
        approvals.forEach(a => {
            console.log(`  - Role: ${a.role}, Status: ${a.status}, Approver: ${a.approver?.name}`);
        });
    }
    await prisma.$disconnect();
}
run();
