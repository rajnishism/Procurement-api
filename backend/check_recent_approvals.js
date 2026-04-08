import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const prs = await prisma.pr.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                approvals: {
                    include: { approver: true }
                }
            }
        });

        if (prs.length === 0) {
            console.log("No PRs found.");
            return;
        }

        prs.forEach(pr => {
            console.log(`PR: ${pr.prNumber} (ID: ${pr.id})`);
            console.log("Approvals:");
            if (pr.approvals.length === 0) console.log("  (No approvals found)");
            pr.approvals.forEach(a => {
                console.log(`- ID: ${a.id}, Role: ${a.role}, Status: ${a.status}, Approver: ${a.approver?.name || 'N/A'}, CreatedAt: ${a.createdAt}`);
            });
            console.log("-----------------------------------");
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
