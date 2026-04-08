import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const vendors = await prisma.vendor.count();
  console.log(`Vendors count: ${vendors}`);
  process.exit(0);
}

main();
