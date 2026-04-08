import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const seedAdmin = async () => {
    const email = 'admin@procurement.com';

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log('✅ Default admin already exists. Skipping seed.');
        return;
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await prisma.user.create({
        data: {
            name: 'System Administrator',
            email,
            password: hashedPassword,
            role: 'ADMIN',
            department: 'IT',
        }
    });

    console.log('🔐 Default ADMIN user created:');
    console.log(`   Email:    ${admin.email}`);
    console.log(`   Password: admin123`);
    console.log(`   Role:     ADMIN`);
    console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION!');
};

seedAdmin()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error('Seed failed:', e);
        prisma.$disconnect();
        process.exit(1);
    });
