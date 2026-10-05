import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'USER', studentId: null },
  });

  if (users.length === 0) {
    console.log('No users without studentId found.');
    return;
  }

  const count = await prisma.user.count({
    where: { role: 'USER', studentId: { not: null } },
  });

  let nextId = count + 1;

  for (const user of users) {
    let studentId = `TRST${nextId.toString().padStart(4, '0')}`;
    let isUnique = false;
    
    while (!isUnique) {
      const check = await prisma.user.findUnique({ where: { studentId } });
      if (!check) {
        isUnique = true;
      } else {
        nextId++;
        studentId = `TRST${nextId.toString().padStart(4, '0')}`;
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { studentId },
    });
    
    console.log(`Updated user ${user.email || user.phone} with studentId ${studentId}`);
    nextId++;
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
