import prisma from "./src/utils/db.js"; async function main() { await prisma.$connect(); console.log("Connected"); await prisma.$disconnect(); } main().catch(console.error);
