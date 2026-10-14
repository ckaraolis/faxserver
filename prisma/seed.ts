import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function parseFaxNumbers(raw: string | undefined) {
  if (!raw?.trim()) return [];
  return raw.split(",").map((entry) => {
    const [numberPart, labelPart] = entry.trim().split("|");
    const number = numberPart.trim();
    const label = (labelPart ?? number).trim();
    return { number, label };
  }).filter((n) => n.number.length > 0);
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@company.com")
    .toLowerCase()
    .trim();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme";
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  const passwordHash = await hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
  });

  const numbers = parseFaxNumbers(process.env.FAX_NUMBERS);
  for (const item of numbers) {
    await prisma.faxNumber.upsert({
      where: { number: item.number },
      update: { label: item.label, isActive: true },
      create: {
        number: item.number,
        label: item.label,
        isActive: true,
      },
    });
  }

  console.log(`Seeded admin user: ${email}`);
  console.log(`Seeded ${numbers.length} fax number(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
