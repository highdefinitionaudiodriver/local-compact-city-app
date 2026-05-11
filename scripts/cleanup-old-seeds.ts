import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Delete the old seed rows whose ids contain non-ASCII characters.
  // Cascade on Vote will clean up any signatures attached to them.
  const all = await prisma.proposal.findMany({
    where: { id: { startsWith: "seed-" } },
    select: { id: true },
  });
  const oldIds = all.filter((p) => /[^\x00-\x7F]/.test(p.id)).map((p) => p.id);

  if (oldIds.length === 0) {
    console.log("No legacy non-ASCII seed proposals found.");
    return;
  }

  const result = await prisma.proposal.deleteMany({
    where: { id: { in: oldIds } },
  });
  console.log(`Deleted ${result.count} legacy seed proposals:`, oldIds);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
