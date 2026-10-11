require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const USER_ID = "87e7dcfe-aa41-4eee-8075-d36d3a688f4e";

async function main() {
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId: USER_ID,
    },
    include: {
      role: true,
    },
  });

  console.log("User roles:");
  console.dir(userRoles, { depth: null });
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });