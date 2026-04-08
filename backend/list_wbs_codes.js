import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const budgetHeads = await prisma.budgetHead.findMany({
        select: {
            id: true,
            name: true,
            code: true,
            department: {
                select: {
                    name: true
                }
            }
        },
        orderBy: {
            id: 'asc'
        }
    });

    console.log('ID | WBS Code | Name | Department');
    console.log('-----------------------------------');
    budgetHeads.forEach(head => {
        console.log(`${head.id} | ${head.code} | ${head.name} | ${head.department.name}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
