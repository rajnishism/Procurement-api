import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const pr = await prisma.pr.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
                approvals: {
                    include: { approver: true }
                }
            }
        });

        if (!pr) {
            console.log("No PRs found.");
            return;
        }

        console.log(`PR: ${pr.prNumber} (ID: ${pr.id})`);
        console.log("Approvals:");
        pr.approvals.forEach(a => {
            console.log(`- ID: ${a.id}, Role: ${a.role}, Status: ${a.status}, Approver: ${a.approver?.name || 'N/A'}, CreatedAt: ${a.createdAt}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
