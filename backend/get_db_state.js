import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('--- Database Overall State ---');
    
    const tables = [
      { name: 'user', label: 'Users' },
      { name: 'pr', label: 'Purchase Requisitions (PR)' },
      { name: 'purchaseOrder', label: 'Purchase Orders (PO)' },
      { name: 'nfa', label: 'Note for Approvals (NFA)' },
      { name: 'approvalRequest', label: 'Total Approval Requests' },
      { name: 'approvalStep', label: 'Total Approval Steps' }
    ];

    for (const table of tables) {
      if (prisma[table.name]) {
        try {
          const count = await prisma[table.name].count();
          console.log(`${table.label}: ${count}`);
        } catch (e) {
          console.log(`${table.label}: Error querying - ${e.message}`);
        }
      } else {
        console.log(`${table.label}: Model NOT FOUND in prisma client (key: ${table.name})`);
      }
    }
    
    // Status Breakdowns for ApprovalRequests
    if (prisma.approvalRequest) {
        const arStatus = await prisma.approvalRequest.groupBy({
          by: ['status'],
          _count: { _all: true }
        });
        console.log('\n--- Approval Requests Status ---');
        arStatus.forEach(s => console.log(`${s.status}: ${s._count._all}`));
    }
    
    // Status Breakdowns for ApprovalSteps
    if (prisma.approvalStep) {
        const asStatus = await prisma.approvalStep.groupBy({
          by: ['status'],
          _count: { _all: true }
        });
        console.log('\n--- Approval Steps Status ---');
        asStatus.forEach(s => console.log(`${s.status}: ${s._count._all}`));
    }

  } catch (err) {
    console.error('Error fetching DB state:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
