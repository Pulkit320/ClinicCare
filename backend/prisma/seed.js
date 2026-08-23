import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Patient User
  const patient = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      name: 'Alice Patient',
      email: 'alice@example.com',
      password: hashedPassword,
      role: 'PATIENT'
    }
  });
  console.log('✅ Patient Created:', patient.email);

  // 2. Create Doctor User & Profile
  const doctorUser = await prisma.user.upsert({
    where: { email: 'drsmith@example.com' },
    update: {},
    create: {
      name: 'Dr. Smith',
      email: 'drsmith@example.com',
      password: hashedPassword,
      role: 'DOCTOR'
    }
  });

  const doctorProfile = await prisma.doctorProfile.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: {
      userId: doctorUser.id,
      specialization: 'General Physician',
      workingHours: '09:00-17:00',
      slotDuration: 30
    }
  });
  console.log('✅ Doctor Created:', doctorUser.email, '| Specialization:', doctorProfile.specialization);

  // 3. Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Clinic Administrator',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'ADMIN'
    }
  });
  console.log('✅ Admin Created:', admin.email);

  console.log('🎉 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
