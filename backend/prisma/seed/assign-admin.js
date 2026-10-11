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
  console.log("🌱 Assigning ADMIN role...");

  // 1. Find the user
  const user = await prisma.user.findUnique({
    where: {
      id: USER_ID,
    },
  });

  if (!user) {
    throw new Error(`User ${USER_ID} not found`);
  }

  console.log(`👤 User found: ${user.firstName} ${user.lastName}`);

  // 2. Find ADMIN role
  const role = await prisma.role.findUnique({
    where: {
      name: "ADMIN",
    },
  });

  if (!role) {
    throw new Error("ADMIN role not found");
  }

  console.log(`🔐 Role found: ${role.name}`);

  // 3. Check existing relationship
  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      roleId: role.id,
    },
  });

  if (existingUserRole) {
    console.log("ℹ️ ADMIN role is already assigned to this user.");
    return;
  }

  // 4. Create relationship
  const userRole = await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: role.id,
    },
  });

  console.log("✅ ADMIN role assigned successfully!");
  console.log("UserRole ID:", userRole.id);
}

main()
  .catch((error) => {
    console.error("❌ Failed to assign ADMIN role:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });