import prisma from './src/utils/db.js';
async function run() {
    const list = await prisma.prApproval.groupBy({
        by: ['prId', 'role'],
        _count: { id: true },
        having: { id: { _count: { gt: 1 } } }
    });
    console.log("Duplicate Role Groups:", JSON.stringify(list, null, 2));
    
    for (const item of list) {
        if (!item.role) continue;
        const details = await prisma.prApproval.findMany({
            where: { prId: item.prId, role: item.role },
            include: { approver: true }
        });
        console.log(`PR: ${item.prId}, Role: ${item.role}`);
        details.forEach(d => console.log(`  - ID: ${d.id}, Approver: ${d.approver?.name}, Status: ${d.status}`));
    }
    await prisma.$disconnect();
}
run();
