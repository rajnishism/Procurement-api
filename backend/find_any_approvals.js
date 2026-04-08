import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const prWithApprovals = await prisma.pr.findFirst({
            where: {
                approvals: { some: {} }
            },
            include: {
                approvals: {
                    include: { approver: true }
                }
            }
        });

        if (!prWithApprovals) {
            console.log("No PRs with approvals found.");
            return;
        }

        console.log(`PR: ${prWithApprovals.prNumber} (ID: ${prWithApprovals.id})`);
        console.log("Approvals:");
        prWithApprovals.approvals.forEach(a => {
            console.log(`- ID: ${a.id}, Role: ${a.role}, Status: ${a.status}, Approver: ${a.approver?.name || 'N/A'}, CreatedAt: ${a.createdAt}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
