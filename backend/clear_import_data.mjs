import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import prisma from './src/utils/db.js';

async function clearData() {
    console.log('Clearing imported data...');
    try {
        // Delete in order to respect foreign keys
        const mb = await prisma.monthlyBudget.deleteMany({});
        console.log(`Deleted ${mb.count} monthly budget records.`);

        const al = await prisma.allocation.deleteMany({});
        console.log(`Deleted ${al.count} allocation records.`);

        const wbs = await prisma.wbsMaster.deleteMany({});
        console.log(`Deleted ${wbs.count} WBS records.`);

        const sc = await prisma.subClassification.deleteMany({});
        console.log(`Deleted ${sc.count} sub-classification records.`);

        const bh = await prisma.budgetHead.deleteMany({});
        console.log(`Deleted ${bh.count} budget head records.`);

        const pr = await prisma.pr.deleteMany({});
        console.log(`Deleted ${pr.count} PR records.`);

        const log = await prisma.migrationLog.deleteMany({});
        console.log(`Deleted ${log.count} migration logs.`);

        console.log('Data cleanup complete.');
        console.log('Note: Departments were not deleted to preserve base configuration.');
    } catch (error) {
        console.error('Error clearing data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearData();
